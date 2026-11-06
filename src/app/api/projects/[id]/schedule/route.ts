import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { scheduleItemCreateSchema } from '@/lib/validations'
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
    const project = await prisma.project.findUnique({
      where: { id },
      include: { projectSuppliers: { include: { supplier: { select: { userId: true } } } } },
    })
    const supplierUserIds = project?.projectSuppliers
      .map(item => item.supplier.userId)
      .filter((userId): userId is string => Boolean(userId)) ?? []
    if (!project || !canViewProject(session.user.role, session.user.id, project.managerId, project.creatorId, supplierUserIds)) {
      return NextResponse.json({ error: 'Proyecto no encontrado o sin permisos' }, { status: 404 })
    }
    const { searchParams } = new URL(request.url)
    const phaseId = searchParams.get('phaseId')

    const where: any = { projectId: id }
    if (phaseId) where.phaseId = phaseId

    const scheduleItems = await prisma.scheduleItem.findMany({
      where,
      include: {
        phase: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        supplier: { select: { id: true, companyName: true } },
        budgetLine: { select: { id: true, code: true, name: true, parentId: true } },
        children: true,
        deliverables: true,
      },
      orderBy: { code: 'asc' },
    })

    return NextResponse.json({ scheduleItems })
  } catch (error) {
    console.error('Error fetching schedule:', error)
    return NextResponse.json({ error: 'Error al obtener cronograma' }, { status: 500 })
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

    const body: unknown = await request.json().catch(() => null)
    const parsed = scheduleItemCreateSchema.safeParse({
      ...(typeof body === 'object' && body !== null ? body : {}),
      projectId: id,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }
    const data = parsed.data
    if (data.plannedEnd < data.plannedStart) {
      return NextResponse.json({ error: 'La fecha de fin debe ser igual o posterior al inicio.' }, { status: 400 })
    }

    if (!data.budgetLineId) {
      return NextResponse.json({ error: 'Selecciona el subrubro al que pertenece esta actividad.' }, { status: 400 })
    }
    const budgetLine = await prisma.budgetLine.findFirst({
      where: { id: data.budgetLineId, projectId: id, parentId: { not: null } },
    })
    if (!budgetLine) {
      return NextResponse.json({ error: 'El subrubro no pertenece a este proyecto.' }, { status: 400 })
    }
    if (data.assigneeId) {
      const assignee = await prisma.user.findFirst({
        where: { id: data.assigneeId, isActive: true },
        select: { id: true },
      })
      if (!assignee) {
        return NextResponse.json({ error: 'El responsable seleccionado no está activo.' }, { status: 400 })
      }
    }

    const parent = data.parentId
      ? await prisma.scheduleItem.findFirst({ where: { id: data.parentId, projectId: id } })
      : null
    if (data.parentId && !parent) {
      return NextResponse.json({ error: 'La actividad superior no pertenece a este proyecto.' }, { status: 400 })
    }
    const siblings = await prisma.scheduleItem.count({
      where: { projectId: id, phaseId: data.phaseId, parentId: data.parentId },
    })
    const code = parent ? `${parent.code}.${siblings + 1}` : `${siblings + 1}`

    const scheduleItem = await prisma.scheduleItem.create({
      data: { ...data, code },
      include: {
        phase: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        supplier: { select: { id: true, companyName: true } },
      },
    })

    await prisma.activityLog.create({
      data: {
        projectId: id,
        userId: session.user.id,
        action: 'CREATE',
        entity: 'SCHEDULE_ITEM',
        entityId: scheduleItem.id,
        newData: scheduleItem,
      },
    })

    return NextResponse.json(scheduleItem, { status: 201 })
  } catch (error) {
    console.error('Error creating schedule item:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Datos inválidos', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear actividad' }, { status: 500 })
  }
}