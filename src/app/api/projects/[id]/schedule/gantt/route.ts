import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

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

    const scheduleItems = await prisma.scheduleItem.findMany({
      where: { projectId: id },
      include: {
        phase: { select: { id: true, name: true, order: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        supplier: { select: { id: true, companyName: true } },
      },
      orderBy: { code: 'asc' },
    })

    // Convertir a formato Gantt
    const ganttData = scheduleItems.map(item => ({
      id: item.id,
      name: item.name,
      code: item.code,
      type: item.type,
      phase: item.phase?.name,
      phaseId: item.phaseId,
      phaseOrder: item.phase?.order,
      start: item.plannedStart,
      end: item.plannedEnd,
      actualStart: item.actualStart,
      actualEnd: item.actualEnd,
      progress: item.progress,
      status: item.status,
      isMilestone: item.isMilestone,
      isCriticalPath: item.isCriticalPath,
      dependencies: item.dependencies,
      assignee: item.assignee,
      supplier: item.supplier,
      estimatedCost: item.estimatedCost,
      actualCost: item.actualCost,
      children: item.children?.map(c => c.id) || [],
    }))

    // Obtener fases para agrupación
    const phases = await prisma.projectPhase.findMany({
      where: { projectId: id },
      orderBy: { order: 'asc' },
      select: { id: true, name: true, order: true, startDate: true, endDate: true, progress: true },
    })

    return NextResponse.json({ ganttData, phases })
  } catch (error) {
    console.error('Error fetching gantt data:', error)
    return NextResponse.json({ error: 'Error al obtener datos de Gantt' }, { status: 500 })
  }
}