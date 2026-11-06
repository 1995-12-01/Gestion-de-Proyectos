import { NextRequest, NextResponse } from 'next/server'
import { BudgetItemType, Prisma, UserRole } from '@prisma/client'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const updateSchema = z.object({
  code: z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9._-]+$/).transform(value => value.toUpperCase()).optional(),
  name: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  type: z.nativeEnum(BudgetItemType).optional(),
  order: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const body: unknown = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  try {
    const budgetBaseLine = await prisma.budgetBaseLine.update({ where: { id }, data: parsed.data })
    return NextResponse.json(budgetBaseLine)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una línea base con ese código.' }, { status: 409 })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Línea presupuestaria base no encontrada.' }, { status: 404 })
    }
    console.error('Error updating budget base line:', error)
    return NextResponse.json({ error: 'No se pudo actualizar la línea presupuestaria base.' }, { status: 500 })
  }
}
