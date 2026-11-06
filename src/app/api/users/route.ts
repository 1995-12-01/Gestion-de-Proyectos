import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { UserRole } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { userCreateSchema } from '@/lib/validations'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.PROJECT_MANAGER) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    where: { isActive: true, role: { in: [UserRole.ADMIN, UserRole.PROJECT_MANAGER] } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
  })

  return NextResponse.json({ users })
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
  const parsed = userCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('User creation requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
    return NextResponse.json(
      { error: 'La creación de usuarios no está configurada en el servidor.' },
      { status: 500 }
    )
  }

  const { email, name, password, role, phone, department } = parsed.data

  try {
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    })
    if (existingUser) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese correo.' }, { status: 409 })
    }

    const normalizedUrl = supabaseUrl.replace(/\/$/, '')
    const createResponse = await fetch(`${normalizedUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: name ?? '', phone: phone ?? '' },
      }),
      cache: 'no-store',
    })

    if (createResponse.status === 409) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta de autenticación con ese correo.' },
        { status: 409 }
      )
    }
    if (createResponse.status === 422) {
      return NextResponse.json(
        { error: 'Supabase rechazó los datos. Verifica si el correo ya está registrado y si la contraseña cumple la política.' },
        { status: 400 }
      )
    }
    if (!createResponse.ok) {
      console.error(`Supabase Auth user creation failed with status ${createResponse.status}.`)
      return NextResponse.json(
        { error: 'No se pudo crear la cuenta en Supabase Auth.' },
        { status: 502 }
      )
    }

    const authPayload: unknown = await createResponse.json()
    if (
      typeof authPayload !== 'object' ||
      authPayload === null ||
      !('id' in authPayload) ||
      typeof authPayload.id !== 'string'
    ) {
      console.error('Supabase Auth returned an invalid user creation response.')
      return NextResponse.json(
        { error: 'Supabase Auth devolvió una respuesta inválida.' },
        { status: 502 }
      )
    }

    try {
      const user = await prisma.user.create({
        data: {
          id: authPayload.id,
          email,
          name: name || null,
          role,
          phone: phone || null,
          department: department || null,
          isActive: true,
        },
        select: { id: true, email: true, name: true, role: true },
      })

      return NextResponse.json(user, { status: 201 })
    } catch (databaseError) {
      let rollbackSucceeded = false
      try {
        const rollbackResponse = await fetch(
          `${normalizedUrl}/auth/v1/admin/users/${encodeURIComponent(authPayload.id)}`,
          {
            method: 'DELETE',
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            cache: 'no-store',
          }
        )
        rollbackSucceeded = rollbackResponse.ok
        if (!rollbackResponse.ok) {
          console.error(
            `Could not roll back Supabase Auth user ${authPayload.id}; rollback status ${rollbackResponse.status}.`
          )
        }
      } catch (rollbackError) {
        console.error(`Could not roll back Supabase Auth user ${authPayload.id}:`, rollbackError)
      }
      console.error('Could not create the application user record:', databaseError)
      return NextResponse.json(
        {
          error: rollbackSucceeded
            ? 'No se pudo guardar el perfil del usuario en la aplicación.'
            : 'No se pudo guardar el perfil; la cuenta de autenticación pudo quedar creada. Contacta a soporte.',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Error al crear el usuario.' }, { status: 500 })
  }
}
