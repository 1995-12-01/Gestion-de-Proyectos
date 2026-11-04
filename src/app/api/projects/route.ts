import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { projectCreateSchema, projectFilterSchema } from '@/lib/validations'
import { hasPermission } from '@/lib/permissions'
import { ProjectStatus, ProjectType, UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters = projectFilterSchema.parse(Object.fromEntries(searchParams))

    const where: any = {}

    // Filtros de búsqueda
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    if (filters.type) where.type = filters.type
    if (filters.status) where.status = filters.status
    if (filters.managerId) where.managerId = filters.managerId
    if (filters.fiscalYear) where.fiscalYear = filters.fiscalYear

    // Filtros de fecha
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom
      if (filters.dateTo) where.createdAt.lte = filters.dateTo
    }

    // Permisos: usuarios no admin solo ven sus proyectos
    if (session.user.role !== 'ADMIN' && session.user.role !== 'AUDITOR') {
      where.OR = [
        { managerId: session.user.id },
        { creatorId: session.user.id },
        { projectSuppliers: { some: { supplier: { userId: session.user.id } } } },
      ]
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { [filters.sort!]: filters.order },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: {
          manager: { select: { id: true, name: true, email: true, avatarUrl: true } },
          creator: { select: { id: true, name: true, email: true } },
          _count: { select: { phases: true, budgetLines: true, scheduleItems: true, deliverables: true } },
        },
      }),
      prisma.project.count({ where }),
    ])

    return NextResponse.json({
      projects,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Error al obtener proyectos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role as UserRole, 'PROJECT_CREATE')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const data = projectCreateSchema.parse(body)

    // Generar código único
    const year = new Date().getFullYear()
    const count = await prisma.project.count({
      where: { type: data.type, createdAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
    })
    const code = data.type === 'AUTHORIZED_PLAN'
      ? `PAE-${year}-${(count + 1).toString().padStart(4, '0')}`
      : `PRM-${year}-${(count + 1).toString().padStart(4, '0')}`

    const project = await prisma.project.create({
      data: {
        ...data,
        code,
        creatorId: session.user.id,
        status: 'DRAFT',
      },
      include: {
        manager: { select: { id: true, name: true, email: true } },
      },
    })

    // Log de actividad
    await prisma.activityLog.create({
      data: {
        projectId: project.id,
        userId: session.user.id,
        action: 'CREATE',
        entity: 'PROJECT',
        entityId: project.id,
        newData: project,
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Datos inválidos', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear proyecto' }, { status: 500 })
  }
}