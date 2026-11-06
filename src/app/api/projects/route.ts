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
    const conditions: any[] = []

    if (filters.search) {
      conditions.push({ OR: [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ] })
    }

    if (filters.type) where.type = filters.type
    if (filters.status) where.status = filters.status
    if (filters.managerId) where.managerId = filters.managerId
    if (filters.fiscalYear) where.fiscalYear = filters.fiscalYear

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom
      if (filters.dateTo) where.createdAt.lte = filters.dateTo
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'AUDITOR') {
      conditions.push({ OR: [
        { managerId: session.user.id },
        { creatorId: session.user.id },
        { projectSuppliers: { some: { supplier: { userId: session.user.id } } } },
      ] })
    }
    if (conditions.length) where.AND = conditions

    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'code', 'status']
    const sort = filters.sort && allowedSortFields.includes(filters.sort) ? filters.sort : 'createdAt'

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { [sort]: filters.order },
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

    const body: unknown = await request.json().catch(() => null)
    const parsed = projectCreateSchema.safeParse({
      ...(typeof body === 'object' && body !== null ? body : {}),
      managerId: session.user.id,
    })
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { baseBudgetLines, ...data } = parsed.data
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      return NextResponse.json({ error: 'La fecha de fin debe ser igual o posterior al inicio.' }, { status: 400 })
    }

    const year = new Date().getFullYear()
    const [count, baseLines] = await Promise.all([
      prisma.project.count({
        where: { type: data.type, createdAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
      }),
      prisma.budgetBaseLine.findMany({
        where: { id: { in: baseBudgetLines.map(line => line.baseLineId) }, isActive: true },
      }),
    ])
    if (baseLines.length !== new Set(baseBudgetLines.map(line => line.baseLineId)).size) {
      return NextResponse.json({ error: 'Una o más líneas base ya no están activas o no existen.' }, { status: 400 })
    }

    const code = data.type === 'AUTHORIZED_PLAN'
      ? `PAE-${year}-${(count + 1).toString().padStart(4, '0')}`
      : `PRM-${year}-${(count + 1).toString().padStart(4, '0')}`
    const totalBudget = baseBudgetLines.reduce((sum, line) => sum + line.budgetedAmount, 0)

    const project = await prisma.$transaction(async tx => {
      const created = await tx.project.create({
        data: {
          ...data,
          totalBudget,
          code,
          creatorId: session.user.id,
          status: 'DRAFT',
        },
        include: { manager: { select: { id: true, name: true, email: true } } },
      })

      for (let index = 0; index < baseBudgetLines.length; index += 1) {
        const allocation = baseBudgetLines[index]
        const baseLine = baseLines.find(line => line.id === allocation.baseLineId)!
        await tx.budgetLine.create({
          data: {
            projectId: created.id,
            baseLineId: baseLine.id,
            code: `RUB-${String(index + 1).padStart(3, '0')}`,
            name: baseLine.name,
            description: baseLine.description,
            type: baseLine.type,
            budgetedAmount: allocation.budgetedAmount,
            order: index,
          },
        })
      }

      await tx.activityLog.create({
        data: {
          projectId: created.id,
          userId: session.user.id,
          action: 'CREATE',
          entity: 'PROJECT',
          entityId: created.id,
          newData: { code: created.code, name: created.name, currency: created.currency },
        },
      })

      return created
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Error al crear proyecto' }, { status: 500 })
  }
}