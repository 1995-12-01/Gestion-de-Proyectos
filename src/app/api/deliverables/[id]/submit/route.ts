import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { canViewProject } from '@/lib/permissions'

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
    const body = await request.json()
    const { files } = body as { files: string[] }

    const deliverable = await prisma.deliverable.findUnique({
      where: { id },
      include: {
        project: {
          include: { projectSuppliers: { include: { supplier: true } } },
        },
      },
    })

    if (!deliverable) {
      return NextResponse.json({ error: 'Entregable no encontrado' }, { status: 404 })
    }

    const supplierIds = deliverable.project.projectSuppliers.map(ps => ps.supplier.userId).filter(Boolean) as string[]
    const canView = canViewProject(session.user.role, session.user.id, deliverable.project.managerId, deliverable.project.creatorId, supplierIds)

    // Verificar que el usuario es el responsable o tiene permisos
    const isResponsible = deliverable.responsibleId === session.user.id
    const isManager = ['ADMIN', 'PROJECT_MANAGER'].includes(session.user.role) &&
      (session.user.id === deliverable.project.managerId || session.user.id === deliverable.project.creatorId)

    if (!canView && !isResponsible && !isManager) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const updated = await prisma.deliverable.update({
      where: { id },
      data: {
        status: 'IN_REVIEW',
        submittedDate: new Date(),
        files: [...deliverable.files, ...files],
        version: { increment: 1 },
      },
    })

    await prisma.activityLog.create({
      data: {
        projectId: deliverable.projectId,
        userId: session.user.id,
        action: 'SUBMIT',
        entity: 'DELIVERABLE',
        entityId: id,
        newData: { files, status: 'IN_REVIEW' },
      },
    })

    // Notificar al revisor si existe
    if (deliverable.reviewerId && deliverable.reviewerId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: deliverable.reviewerId,
          title: 'Nuevo entregable para revisión',
          message: `El entregable "${deliverable.name}" ha sido enviado para revisión`,
          type: 'INFO',
          link: `/projects/${deliverable.projectId}/deliverables/${id}`,
        },
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error submitting deliverable:', error)
    return NextResponse.json({ error: 'Error al enviar entregable' }, { status: 500 })
  }
}