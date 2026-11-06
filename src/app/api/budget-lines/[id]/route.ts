import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { budgetLineUpdateSchema } from '@/lib/validations'
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
    const budgetLine = await prisma.budgetLine.findUnique({
      where: { id },
      include: { project: true },
    })

    if (!budgetLine) {
      return NextResponse.json({ error: 'Rubro no encontrado' }, { status: 404 })
    }

    const canManage = canManageProject(session.user.role, session.user.id, budgetLine.project.managerId, budgetLine.project.creatorId)
    if (!canManage) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const data = budgetLineUpdateSchema.parse(body)
    if (data.budgetedAmount !== undefined) {
      const childAmounts = await prisma.budgetLine.aggregate({
        where: budgetLine.parentId
          ? { parentId: budgetLine.parentId, id: { not: budgetLine.id } }
          : { parentId: budgetLine.id },
        _sum: { budgetedAmount: true },
      })
      if (budgetLine.parentId) {
        const parent = await prisma.budgetLine.findUnique({ where: { id: budgetLine.parentId } })
        if (!parent || Number(childAmounts._sum.budgetedAmount ?? 0) + data.budgetedAmount > Number(parent.budgetedAmount)) {
          return NextResponse.json({ error: 'La suma de los subrubros no puede superar el monto de la línea base.' }, { status: 400 })
        }
      } else if (Number(childAmounts._sum.budgetedAmount ?? 0) > data.budgetedAmount) {
        return NextResponse.json({ error: 'El monto de la línea base no puede ser menor que la suma de sus subrubros.' }, { status: 400 })
      }
    }

    const updated = await prisma.budgetLine.update({
      where: { id },
      data,
      include: { items: { include: { supplier: true } } },
    })

    await updateProjectBudgetTotals(budgetLine.projectId)

    await prisma.activityLog.create({
      data: {
        projectId: budgetLine.projectId,
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'BUDGET_LINE',
        entityId: id,
        newData: data,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating budget line:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Datos inválidos', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al actualizar rubro' }, { status: 500 })
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
    const budgetLine = await prisma.budgetLine.findUnique({
      where: { id },
      include: { project: true },
    })

    if (!budgetLine) {
      return NextResponse.json({ error: 'Rubro no encontrado' }, { status: 404 })
    }

    const canManage = canManageProject(session.user.role, session.user.id, budgetLine.project.managerId, budgetLine.project.creatorId)
    if (!canManage) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    await prisma.budgetLine.delete({ where: { id } })
    await updateProjectBudgetTotals(budgetLine.projectId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting budget line:', error)
    return NextResponse.json({ error: 'Error al eliminar rubro' }, { status: 500 })
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