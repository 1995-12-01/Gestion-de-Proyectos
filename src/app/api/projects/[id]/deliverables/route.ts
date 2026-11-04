import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { deliverableCreateSchema } from '@/lib/validations'
import { canManageProject, canViewProject } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const scheduleItemId = searchParams.get('scheduleItemId')

    const project = await prisma.project.findUnique({
      where: { id },
      include: { projectSuppliers: { include: { supplier: true } } },
    })

    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    const supplierIds = project.projectSuppliers.map(ps => ps.supplier.userId).filter(Boolean) as string[]
    const canView = canViewProject(session.user.role, session.user.id, project.managerId, project.creatorId, supplierIds)
    if (!canView) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const where: any = { projectId: id }
    if (scheduleItemId) where.scheduleItemId = scheduleItemId

    const deliverables = await prisma.deliverable.findMany({
      where,
      include: {
        scheduleItem: { select: { id: true, name: true, code: true } },
        responsible: { select: { id: true, name: true, email: true, avatarUrl: true } },
        reviewer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { dueDate: 'asc' },
    })

    return NextResponse.json({ deliverables })
  } catch (error) {
    console.error('Error fetching deliverables:', error)
    return NextResponse.json({ error: 'Error al obtener entregables' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    const canManage = canManageProject(session.user.role, session.user.id, project.managerId, project.creatorId)
    if (!canManage) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const data = deliverableCreateSchema.parse({ ...body, projectId: id })

    // Generar código
    const count = await prisma.deliverable.count({ where: { projectId: id } })
    const code = `ENT-${(count + 1).toString().padStart(3, '0')}`

    const deliverable = await prisma.deliverable.create({
      data: { ...data, code },
      include: {
        scheduleItem: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true, email: true } },
      },
    })

    await prisma.activityLog.create({
      data: {
        projectId: id,
        userId: session.user.id,
        action: 'CREATE',
        entity: 'DELIVERABLE',
        entityId: deliverable.id,
        newData: deliverable,
      },
    })

    return NextResponse.json(deliverable, { status: 201 })
  } catch (error) {
    console.error('Error creating deliverable:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Datos inválidos', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear entregable' }, { status: 500 })
  }
}