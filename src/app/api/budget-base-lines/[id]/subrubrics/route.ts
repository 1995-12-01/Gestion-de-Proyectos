import { NextRequest, NextResponse } from 'next/server'
import { Prisma, UserRole } from '@prisma/client'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const createSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).optional(),
})

export async function POST(
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

  const { id: baseLineId } = await params
  const body: unknown = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  try {
    const subrubric = await prisma.$transaction(async tx => {
      const baseLine = await tx.budgetBaseLine.findUnique({ where: { id: baseLineId } })
      if (!baseLine) return null

      const existing = await tx.budgetBaseSubrubric.findMany({
        where: { baseLineId },
        select: { code: true },
      })
      const maxSequence = existing.reduce((max, item) => {
        const match = /^SUB-(\d+)$/.exec(item.code)
        return match ? Math.max(max, Number(match[1])) : max
      }, 0)

      return tx.budgetBaseSubrubric.create({
        data: {
          ...parsed.data,
          baseLineId,
          code: `SUB-${String(maxSequence + 1).padStart(3, '0')}`,
          order: existing.length,
        },
      })
    })

    if (!subrubric) {
      return NextResponse.json({ error: 'Línea presupuestaria base no encontrada.' }, { status: 404 })
    }
    return NextResponse.json(subrubric, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'No se pudo asignar un código único al subrubro. Inténtalo de nuevo.' }, { status: 409 })
    }
    console.error('Error creating budget base subrubric:', error)
    return NextResponse.json({ error: 'No se pudo crear el subrubro.' }, { status: 500 })
  }
}
