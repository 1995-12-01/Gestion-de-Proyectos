import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { deliverableUpdateSchema, deliverableReviewSchema } from '@/lib/validations'
import { canManageProject, canViewProject } from '@/lib/permissions'
import { UserRole, DeliverableStatus } from '@prisma/client'

async function checkDeliverableAccess(deliverableId: string, session: any) {
  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    include: {
      project: {
        include: { projectSuppliers: { include: { supplier: true } } },
      },
    },
  })

  if (!deliverable) return { deliverable: null, canView: false, canManage: false, canReview: false }

  const supplierIds = deliverable.project.projectSuppliers.map(ps => ps.supplier.userId).filter(Boolean) as string[]
  const canView = canViewProject(session.user.role, session.user.id, deliverable.project.managerId, deliverable.project.creatorId, supplierIds)
  const canManage = canManageProject(session.user.role, session.user.id, deliverable.project.managerId, deliverable.project.creatorId)
  const canReview = ['ADMIN', 'PROJECT_MANAGER', 'AUDITOR'].includes(session.user.role) || deliverable.reviewerId === session.user.id

  return { deliverable, canView, canManage, canReview }
}

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
    const { deliverable, canView } = await checkDeliverableAccess(id, session)

    if (!deliverable || !canView) {
      return NextResponse.json({ error: 'Entregable no encontrado' }, { status: 404 })
    }

    return NextResponse.json(deliverable)
  } catch (error) {
    console.error('Error fetching deliverable:', error)
    return NextResponse.json({ error: 'Error al obtener entregable' }, { status: 500 })
  }
}

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
    const { deliverable, canManage, canReview } = await checkDeliverableAccess(id, session)

    if (!deliverable) {
      return NextResponse.json({ error: 'Entregable no encontrado' }, { status: 404 })
    }

    const body = await request.json()

    // Si solo se actualiza el estado (revisión), verificar permisos de revisor
    if (body.status && !canManage && !canReview) {
      return NextResponse.json({ error: 'Sin permisos para revisar' }, { status: 403 })
    }

    // Validar según permisos
    const data = canManage ? deliverableUpdateSchema.parse(body) : deliverableReviewSchema.parse(body)

    const updateData: any = { ...data }
    if (data.status) {
      updateData.reviewedDate = new Date()
      if (data.status === 'APPROVED') updateData.approvedDate = new Date()
      updateData.version = { increment: 1 }
    }

    const updated = await prisma.deliverable.update({
      where: { id },
      data: updateData,
      include: {
        responsible: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true, email: true } },
      },
    })

    await prisma.activityLog.create({
      data: {
        projectId: deliverable.projectId,
        userId: session.user.id,
        action: data.status ? 'REVIEW' : 'UPDATE',
        entity: 'DELIVERABLE',
        entityId: id,
        newData: updateData,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating deliverable:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Datos inválidos', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al actualizar entregable' }, { status: 500 })
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
    const { deliverable, canManage } = await checkDeliverableAccess(id, session)

    if (!deliverable || !canManage) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    await prisma.deliverable.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting deliverable:', error)
    return NextResponse.json({ error: 'Error al eliminar entregable' }, { status: 500 })
  }
}