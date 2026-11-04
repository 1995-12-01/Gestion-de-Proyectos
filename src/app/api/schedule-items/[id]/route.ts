import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { scheduleItemUpdateSchema } from '@/lib/validations'
import { canManageProject } from '@/lib/permissions'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const scheduleItem = await prisma.scheduleItem.findUnique({
      where: { id },
      include: { project: true },
    })

    if (!scheduleItem) {
      return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 })
    }

    const canManage = canManageProject(session.user.role, session.user.id, scheduleItem.project.managerId, scheduleItem.project.creatorId)
    if (!canManage) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const data = scheduleItemUpdateSchema.parse(body)

    const updated = await prisma.scheduleItem.update({
      where: { id },
      data,
      include: {
        phase: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        supplier: { select: { id: true, companyName: true } },
      },
    })

    // Actualizar progreso de la fase si existe
    if (scheduleItem.phaseId && data.progress !== undefined) {
      await updatePhaseProgress(scheduleItem.phaseId)
    }

    await prisma.activityLog.create({
      data: {
        projectId: scheduleItem.projectId,
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'SCHEDULE_ITEM',
        entityId: id,
        newData: data,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating schedule item:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Datos inválidos', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al actualizar actividad' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const scheduleItem = await prisma.scheduleItem.findUnique({
      where: { id },
      include: { project: true },
    })

    if (!scheduleItem) {
      return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 })
    }

    const canManage = canManageProject(session.user.role, session.user.id, scheduleItem.project.managerId, scheduleItem.project.creatorId)
    if (!canManage) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    await prisma.scheduleItem.delete({ where: { id } })

    if (scheduleItem.phaseId) {
      await updatePhaseProgress(scheduleItem.phaseId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting schedule item:', error)
    return NextResponse.json({ error: 'Error al eliminar actividad' }, { status: 500 })
  }
}

async function updatePhaseProgress(phaseId: string) {
  const items = await prisma.scheduleItem.findMany({ where: { phaseId } })
  if (items.length === 0) return

  const totalProgress = items.reduce((sum, i) => sum + i.progress, 0)
  const avgProgress = totalProgress / items.length

  await prisma.projectPhase.update({
    where: { id: phaseId },
    data: { progress: Math.round(avgProgress) },
  })
}