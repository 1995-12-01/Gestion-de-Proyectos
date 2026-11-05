import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseConfig } from '@/lib/supabase-auth'

const resetPasswordSchema = z.object({
  accessToken: z.string().min(1),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
})

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null)
  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' },
      { status: 400 }
    )
  }

  const config = getSupabaseConfig()
  if (!config) {
    console.error('Password reset requires SUPABASE_URL and SUPABASE_ANON_KEY.')
    return NextResponse.json({ error: 'La recuperación no está configurada en el servidor.' }, { status: 500 })
  }

  try {
    const response = await fetch(`${config.url}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${parsed.data.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: parsed.data.password }),
      cache: 'no-store',
    })

    if (response.status === 400 || response.status === 401 || response.status === 403) {
      return NextResponse.json(
        { error: 'El enlace venció o ya fue utilizado. Solicita uno nuevo.' },
        { status: 400 }
      )
    }
    if (response.status === 429) {
      return NextResponse.json(
        { error: 'Se hicieron demasiados intentos. Espera un momento e inténtalo de nuevo.' },
        { status: 429 }
      )
    }
    if (!response.ok) {
      console.error(`Supabase password update failed with status ${response.status}.`)
      return NextResponse.json({ error: 'No se pudo actualizar la contraseña.' }, { status: 502 })
    }

    return NextResponse.json({ message: 'Contraseña actualizada.' })
  } catch (error) {
    console.error('Could not reach Supabase Auth to reset the password:', error)
    return NextResponse.json({ error: 'No se pudo conectar con el servicio de recuperación.' }, { status: 502 })
  }
}
