import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { UserRole } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { canViewProject, canManageProject } from '@/lib/permissions'
import prisma from '@/lib/prisma'
import { ProjectWorkspace } from './workspace'

export const dynamic = 'force-dynamic'

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/auth/login')

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      projectSuppliers: { include: { supplier: { select: { userId: true } } } },
      budgetLines: {
        where: { parentId: null },
        orderBy: { order: 'asc' },
        include: { children: { orderBy: { order: 'asc' } } },
      },
      scheduleItems: {
        orderBy: { plannedStart: 'asc' },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          budgetLine: { select: { id: true, name: true, code: true } },
        },
      },
      manager: { select: { id: true, name: true, email: true } },
    },
  })

  if (!project) notFound()
  const supplierUserIds = project.projectSuppliers
    .map(item => item.supplier.userId)
    .filter((id): id is string => Boolean(id))
  if (!canViewProject(session.user.role, session.user.id, project.managerId, project.creatorId, supplierUserIds)) {
    notFound()
  }

  const canManage = canManageProject(
    session.user.role,
    session.user.id,
    project.managerId,
    project.creatorId
  )

  return (
    <ProjectWorkspace
      canManage={canManage}
      project={{
        id: project.id,
        code: project.code,
        name: project.name,
        description: project.description,
        status: project.status,
        currency: project.currency,
        totalBudget: Number(project.totalBudget),
        manager: project.manager,
        budgetLines: project.budgetLines.map(line => ({
          id: line.id,
          baseLineId: line.baseLineId,
          code: line.code,
          name: line.name,
          description: line.description,
          type: line.type,
          budgetedAmount: Number(line.budgetedAmount),
          children: line.children.map(child => ({
            id: child.id,
            code: child.code,
            name: child.name,
            description: child.description,
            type: child.type,
            budgetedAmount: Number(child.budgetedAmount),
          })),
        })),
        scheduleItems: project.scheduleItems.map(item => ({
          id: item.id,
          code: item.code,
          name: item.name,
          plannedStart: item.plannedStart.toISOString(),
          plannedEnd: item.plannedEnd.toISOString(),
          progress: item.progress,
          budgetLine: item.budgetLine,
          assignee: item.assignee,
        })),
      }}
    />
  )
}
