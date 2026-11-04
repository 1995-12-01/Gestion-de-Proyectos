import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { canManageProject } from '@/lib/permissions'

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
    const projectSupplier = await prisma.projectSupplier.findUnique({
      where: { id },
      include: { project: true },
    })

    if (!projectSupplier) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 })
    }

    const canManage = canManageProject(session.user.role, session.user.id, projectSupplier.project.managerId, projectSupplier.project.creatorId)
    if (!canManage) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    await prisma.projectSupplier.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing supplier:', error)
    return NextResponse.json({ error: 'Error al desasignar proveedor' }, { status: 500 })
  }
}