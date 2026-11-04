import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { budgetItemCreateSchema } from '@/lib/validations'
import { canManageProject } from '@/lib/permissions'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = budgetItemCreateSchema.parse(body)

    const budgetLine = await prisma.budgetLine.findUnique({
      where: { id: data.budgetLineId },
      include: { project: true },
    })

    if (!budgetLine) {
      return NextResponse.json({ error: 'Rubro no encontrado' }, { status: 404 })
    }

    const canManage = canManageProject(session.user.role, session.user.id, budgetLine.project.managerId, budgetLine.project.creatorId)
    if (!canManage) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const item = await prisma.budgetItem.create({
      data: {
        ...data,
        totalPrice: data.quantity * data.unitPrice,
      },
      include: { supplier: true },
    })

    // Actualizar montos del rubro
    await updateBudgetLineAmounts(data.budgetLineId)

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Error creating budget item:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Datos inválidos', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear item' }, { status: 500 })
  }
}

async function updateBudgetLineAmounts(budgetLineId: string) {
  const items = await prisma.budgetItem.findMany({ where: { budgetLineId } })
  const committed = items.reduce((sum, i) => sum + Number(i.totalPrice), 0)

  await prisma.budgetLine.update({
    where: { id: budgetLineId },
    data: { committedAmount: committed },
  })

  // Propagar al padre si existe
  const line = await prisma.budgetLine.findUnique({ where: { id: budgetLineId } })
  if (line?.parentId) {
    await updateBudgetLineAmounts(line.parentId)
  } else if (line) {
    await updateProjectBudgetTotals(line.projectId)
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