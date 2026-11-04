import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { projectSupplierCreateSchema } from '@/lib/validations'
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
    const projectSuppliers = await prisma.projectSupplier.findMany({
      where: { projectId: id },
      include: {
        supplier: true,
        budgetLine: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ projectSuppliers })
  } catch (error) {
    console.error('Error fetching project suppliers:', error)
    return NextResponse.json({ error: 'Error al obtener proveedores del proyecto' }, { status: 500 })
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
    const data = projectSupplierCreateSchema.parse({ ...body, projectId: id })

    const projectSupplier = await prisma.projectSupplier.create({
      data,
      include: { supplier: true, budgetLine: true },
    })

    return NextResponse.json(projectSupplier, { status: 201 })
  } catch (error) {
    console.error('Error assigning supplier:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Datos inválidos', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al asignar proveedor' }, { status: 500 })
  }
}