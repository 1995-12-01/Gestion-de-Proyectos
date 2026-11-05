import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseConfig } from '@/lib/supabase-auth'

const recoveryRequestSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
})

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null)
  const parsed = recoveryRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ingresa un correo electrónico válido.' }, { status: 400 })
  }

  const config = getSupabaseConfig()
  if (!config) {
    console.error('Password recovery requires SUPABASE_URL and SUPABASE_ANON_KEY.')
    return NextResponse.json({ error: 'La recuperación no está configurada en el servidor.' }, { status: 500 })
  }

  const appOrigin =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : request.nextUrl.origin)
  const redirectTo = new URL('/auth/reset-password', appOrigin).toString()

  try {
    const response = await fetch(
      `${config.url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
      {
        method: 'POST',
        headers: {
          apikey: config.anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: parsed.data.email }),
        cache: 'no-store',
      }
    )

    if (response.status === 429) {
      return NextResponse.json(
        { error: 'Se solicitaron demasiados enlaces. Espera un momento e inténtalo de nuevo.' },
        { status: 429 }
      )
    }
    if (!response.ok) {
      console.error(`Supabase password recovery request failed with status ${response.status}.`)
      return NextResponse.json({ error: 'No se pudo enviar el correo de recuperación.' }, { status: 502 })
    }

    return NextResponse.json({
      message: 'Si existe una cuenta con ese correo, recibirás instrucciones para restablecer la contraseña.',
    })
  } catch (error) {
    console.error('Could not reach Supabase Auth for password recovery:', error)
    return NextResponse.json({ error: 'No se pudo conectar con el servicio de recuperación.' }, { status: 502 })
  }
}
