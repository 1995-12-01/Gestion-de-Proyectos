import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { canTransitionStatus, canManageProject } from '@/lib/permissions'
import { ProjectStatus, UserRole } from '@prisma/client'

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
    const { status } = body as { status: ProjectStatus }

    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    const canManage = canManageProject(session.user.role as UserRole, session.user.id, project.managerId, project.creatorId)
    if (!canManage && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    if (!canTransitionStatus(project.status, status, session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Transición de estado no permitida' }, { status: 400 })
    }

    const updateData: any = { status }
    if (status === 'APPROVED' && !project.approvedDate) {
      updateData.approvedDate = new Date()
    }

    const updated = await prisma.project.update({
      where: { id },
      data: updateData,
    })

    await prisma.activityLog.create({
      data: {
        projectId: id,
        userId: session.user.id,
        action: 'STATUS_CHANGE',
        entity: 'PROJECT',
        entityId: id,
        oldData: { status: project.status },
        newData: { status },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error changing project status:', error)
    return NextResponse.json({ error: 'Error al cambiar estado' }, { status: 500 })
  }
}