import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { projectUpdateSchema } from '@/lib/validations'
import { hasPermission, canManageProject, canViewProject } from '@/lib/permissions'
import { UserRole } from '@prisma/client'

async function checkProjectAccess(projectId: string, session: any) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { projectSuppliers: { include: { supplier: true } } },
  })

  if (!project) return { project: null, canView: false, canManage: false }

  const supplierIds = project.projectSuppliers.map(ps => ps.supplier.userId).filter(Boolean) as string[]
  const canView = canViewProject(session.user.role, session.user.id, project.managerId, project.creatorId, supplierIds)
  const canManage = canManageProject(session.user.role, session.user.id, project.managerId, project.creatorId)

  return { project, canView, canManage }
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
    const { project, canView } = await checkProjectAccess(id, session)

    if (!project || !canView) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    const fullProject = await prisma.project.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, name: true, email: true, avatarUrl: true, phone: true, department: true } },
        creator: { select: { id: true, name: true, email: true } },
        budgetLines: {
          include: { children: true, items: { include: { supplier: true } } },
          orderBy: { order: 'asc' },
        },
        phases: {
          include: { disbursements: true, scheduleItems: true },
          orderBy: { order: 'asc' },
        },
        scheduleItems: { orderBy: { code: 'asc' } },
        deliverables: { orderBy: { dueDate: 'asc' } },
        projectSuppliers: { include: { supplier: true, budgetLine: true } },
        documents: { orderBy: { createdAt: 'desc' } },
        invoices: { include: { supplier: true }, orderBy: { date: 'desc' } },
        activityLogs: { take: 50, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true } } } },
      },
    })

    return NextResponse.json(fullProject)
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json({ error: 'Error al obtener proyecto' }, { status: 500 })
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
    const { project, canManage } = await checkProjectAccess(id, session)

    if (!project || !canManage) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const data = projectUpdateSchema.parse(body)

    const updated = await prisma.project.update({
      where: { id },
      data,
      include: { manager: { select: { id: true, name: true, email: true } } },
    })

    await prisma.activityLog.create({
      data: {
        projectId: id,
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'PROJECT',
        entityId: id,
        newData: data,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating project:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Datos inválidos', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al actualizar proyecto' }, { status: 500 })
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

    if (!hasPermission(session.user.role as UserRole, 'PROJECT_DELETE')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params

    await prisma.project.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ error: 'Error al eliminar proyecto' }, { status: 500 })
  }
}