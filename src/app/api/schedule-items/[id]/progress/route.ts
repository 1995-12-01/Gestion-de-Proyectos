import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
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
    const body = await request.json()
    const { progress } = body as { progress: number }

    if (progress < 0 || progress > 100) {
      return NextResponse.json({ error: 'Progreso debe estar entre 0 y 100' }, { status: 400 })
    }

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

    const updated = await prisma.scheduleItem.update({
      where: { id },
      data: {
        progress,
        status: progress === 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
        actualStart: progress > 0 && !scheduleItem.actualStart ? new Date() : scheduleItem.actualStart,
        actualEnd: progress === 100 && !scheduleItem.actualEnd ? new Date() : scheduleItem.actualEnd,
      },
    })

    if (scheduleItem.phaseId) {
      await updatePhaseProgress(scheduleItem.phaseId)
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating progress:', error)
    return NextResponse.json({ error: 'Error al actualizar progreso' }, { status: 500 })
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