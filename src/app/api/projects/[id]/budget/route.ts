import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { budgetLineCreateSchema } from '@/lib/validations'
import { canManageProject, canViewProject } from '@/lib/permissions'
import { UserRole } from '@prisma/client'

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
    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }
    const supplierUserIds = project.projectSuppliers
      .map(item => item.supplier.userId)
      .filter((userId): userId is string => Boolean(userId))
    if (!canViewProject(session.user.role, session.user.id, project.managerId, project.creatorId, supplierUserIds)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const budgetLines = await prisma.budgetLine.findMany({
      where: { projectId: id, parentId: null },
      include: {
        children: {
          include: {
            children: { include: { items: { include: { supplier: true } } } },
            items: { include: { supplier: true } },
          },
        },
        items: { include: { supplier: true } },
      },
      orderBy: { order: 'asc' },
    })

    // Calcular resumen
    const summary: { total: number; committed: number; executed: number; pending: number; progress: number } =
      budgetLines.reduce((acc, line) => ({
      total: acc.total + Number(line.budgetedAmount),
      committed: acc.committed + Number(line.committedAmount),
      executed: acc.executed + Number(line.executedAmount),
      pending: acc.pending + Number(line.pendingAmount),
      progress: 0,
    }), { total: 0, committed: 0, executed: 0, pending: 0, progress: 0 })
    summary.progress = summary.total > 0 ? Math.round((summary.executed / summary.total) * 100) : 0

    return NextResponse.json({ budgetLines, summary })
  } catch (error) {
    console.error('Error fetching budget:', error)
    return NextResponse.json({ error: 'Error al obtener presupuesto' }, { status: 500 })
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

    const canManage = canManageProject(session.user.role as UserRole, session.user.id, project.managerId, project.creatorId)
    if (!canManage) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body: unknown = await request.json().catch(() => null)
    const parsed = budgetLineCreateSchema.safeParse({
      ...(typeof body === 'object' && body !== null ? body : {}),
      projectId: id,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }
    const data = parsed.data

    const parent = data.parentId
      ? await prisma.budgetLine.findFirst({ where: { id: data.parentId, projectId: id } })
      : null
    if (data.parentId && !parent) {
      return NextResponse.json({ error: 'La línea base seleccionada no pertenece a este proyecto.' }, { status: 400 })
    }
    if (parent?.parentId) {
      return NextResponse.json({ error: 'Solo se permite un nivel de subrubros bajo cada línea base.' }, { status: 400 })
    }
    if (parent && data.baseLineId) {
      return NextResponse.json({ error: 'Los subrubros no pueden usar una línea base global.' }, { status: 400 })
    }
    if (parent) {
      const currentChildren = await prisma.budgetLine.aggregate({
        where: { parentId: parent.id },
        _sum: { budgetedAmount: true },
      })
      if (Number(currentChildren._sum.budgetedAmount ?? 0) + data.budgetedAmount > Number(parent.budgetedAmount)) {
        return NextResponse.json({ error: 'La suma de los subrubros no puede superar el monto de la línea base.' }, { status: 400 })
      }
    }

    const baseLine = data.baseLineId
      ? await prisma.budgetBaseLine.findFirst({ where: { id: data.baseLineId, isActive: true } })
      : null
    if (data.baseLineId && !baseLine) {
      return NextResponse.json({ error: 'La línea base no existe o está inactiva.' }, { status: 400 })
    }

    const siblingCount = await prisma.budgetLine.count({
      where: { projectId: id, parentId: data.parentId },
    })
    const code = parent
      ? `${parent.code}.${(siblingCount + 1).toString().padStart(2, '0')}`
      : `RUB-${(siblingCount + 1).toString().padStart(3, '0')}`

    const budgetLine = await prisma.budgetLine.create({
      data: {
        ...data,
        name: baseLine?.name ?? data.name,
        description: baseLine?.description ?? data.description,
        type: parent?.type ?? baseLine?.type ?? data.type,
        baseLineId: parent ? null : baseLine?.id,
        code,
        level: parent ? parent.level + 1 : 0,
      },
      include: { items: { include: { supplier: true } } },
    })

    // Actualizar presupuesto total del proyecto
    await updateProjectBudgetTotals(id)

    await prisma.activityLog.create({
      data: {
        projectId: id,
        userId: session.user.id,
        action: 'CREATE',
        entity: 'BUDGET_LINE',
        entityId: budgetLine.id,
        newData: budgetLine,
      },
    })

    return NextResponse.json(budgetLine, { status: 201 })
  } catch (error) {
    console.error('Error creating budget line:', error)
    return NextResponse.json({ error: 'Error al crear rubro' }, { status: 500 })
  }
}

async function updateProjectBudgetTotals(projectId: string) {
  const lines = await prisma.budgetLine.findMany({ where: { projectId, parentId: null } })
  const total = lines.reduce((sum, l) => sum + Number(l.budgetedAmount), 0)
  const committed = lines.reduce((sum, l) => sum + Number(l.committedAmount), 0)
  const executed = lines.reduce((sum, l) => sum + Number(l.executedAmount), 0)

  await prisma.project.update({
    where: { id: projectId },
    data: { totalBudget: total, committedBudget: committed, executedBudget: executed },
  })
}