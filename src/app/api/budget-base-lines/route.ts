import { NextRequest, NextResponse } from 'next/server'
import { BudgetItemType, Prisma, UserRole } from '@prisma/client'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const budgetBaseLineSchema = z.object({
  code: z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9._-]+$/).transform(value => value.toUpperCase()),
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).optional(),
  type: z.nativeEnum(BudgetItemType),
  order: z.coerce.number().int().default(0),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const budgetBaseLines = await prisma.budgetBaseLine.findMany({
    where: session.user.role === UserRole.ADMIN ? {} : { isActive: true },
    orderBy: [{ order: 'asc' }, { code: 'asc' }],
  })

  return NextResponse.json({ budgetBaseLines })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body: unknown = await request.json().catch(() => null)
  const parsed = budgetBaseLineSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  try {
    const budgetBaseLine = await prisma.budgetBaseLine.create({ data: parsed.data })
    return NextResponse.json(budgetBaseLine, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una línea base con ese código.' }, { status: 409 })
    }
    console.error('Error creating budget base line:', error)
    return NextResponse.json({ error: 'No se pudo crear la línea presupuestaria base.' }, { status: 500 })
  }
}
