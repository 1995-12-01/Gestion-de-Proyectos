import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { budgetLineCreateSchema } from '@/lib/validations'
import { hasPermission, canManageProject } from '@/lib/permissions'
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
    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
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
    const calculateSummary = (lines: any[]) => {
      return lines.reduce((acc, line) => {
        acc.total += Number(line.budgetedAmount)
        acc.committed += Number(line.committedAmount)
        acc.executed += Number(line.executedAmount)
        acc.pending += Number(line.pendingAmount)
        if (line.children?.length) {
          const childSummary = calculateSummary(line.children)
          acc.total += childSummary.total
          acc.committed += childSummary.committed
          acc.executed += childSummary.executed
          acc.pending += childSummary.pending
        }
        return acc
      }, { total: 0, committed: 0, executed: 0, pending: 0 })
    }

    const summary = calculateSummary(budgetLines)
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
    if (!canManage && !hasPermission(session.user.role as UserRole, 'BUDGET_CREATE')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const data = budgetLineCreateSchema.parse({ ...body, projectId: id })

    // Generar código
    const siblingCount = await prisma.budgetLine.count({
      where: { projectId: id, parentId: data.parentId },
    })
    const code = data.parentId
      ? `${data.parentId}.${(siblingCount + 1).toString().padStart(2, '0')}`
      : `RUB-${(siblingCount + 1).toString().padStart(3, '0')}`

    const budgetLine = await prisma.budgetLine.create({
      data: { ...data, code, level: data.parentId ? 1 : 0 },
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
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Datos inválidos', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear rubro' }, { status: 500 })
  }
}

async function updateProjectBudgetTotals(projectId: string) {
  const lines = await prisma.budgetLine.findMany({ where: { projectId } })
  const total = lines.reduce((sum, l) => sum + Number(l.budgetedAmount), 0)
  const committed = lines.reduce((sum, l) => sum + Number(l.committedAmount), 0)
  const executed = lines.reduce((sum, l) => sum + Number(l.executedAmount), 0)

  await prisma.project.update({
    where: { id: projectId },
    data: { totalBudget: total, committedBudget: committed, executedBudget: executed },
  })
}