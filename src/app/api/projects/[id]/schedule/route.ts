import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { scheduleItemCreateSchema } from '@/lib/validations'
import { canManageProject } from '@/lib/permissions'

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
    const phaseId = searchParams.get('phaseId')

    const where: any = { projectId: id }
    if (phaseId) where.phaseId = phaseId

    const scheduleItems = await prisma.scheduleItem.findMany({
      where,
      include: {
        phase: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        supplier: { select: { id: true, companyName: true } },
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

    const body = await request.json()
    const data = scheduleItemCreateSchema.parse({ ...body, projectId: id })

    // Generar código WBS
    const siblings = await prisma.scheduleItem.count({
      where: { projectId: id, phaseId: data.phaseId, parentId: data.parentId },
    })
    const code = data.parentId
      ? `${data.parentId}.${siblings + 1}`
      : `${siblings + 1}`

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