import { NextRequest, NextResponse } from 'next/server'
import { Prisma, UserRole } from '@prisma/client'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const updateSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subrubricId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id: baseLineId, subrubricId } = await params
  const body: unknown = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  try {
    const result = await prisma.budgetBaseSubrubric.updateMany({
      where: { id: subrubricId, baseLineId },
      data: parsed.data,
    })
    if (!result.count) {
      return NextResponse.json({ error: 'Subrubro no encontrado.' }, { status: 404 })
    }
    const subrubric = await prisma.budgetBaseSubrubric.findUnique({ where: { id: subrubricId } })
    return NextResponse.json(subrubric)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Subrubro no encontrado.' }, { status: 404 })
    }
    console.error('Error updating budget base subrubric:', error)
    return NextResponse.json({ error: 'No se pudo actualizar el subrubro.' }, { status: 500 })
  }
}
