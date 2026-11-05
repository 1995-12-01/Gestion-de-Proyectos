type SupabaseAuthResult =
  | { status: 'unconfigured' | 'invalid' }
  | { status: 'authenticated'; user: { id: string; email: string } }

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) return null
  return { url: url.replace(/\/$/, ''), anonKey }
}

export async function authenticateWithSupabase(
  email: string,
  password: string
): Promise<SupabaseAuthResult> {
  const config = getSupabaseConfig()
  if (!config) return { status: 'unconfigured' }

  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: config.anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })

  if (response.status === 400 || response.status === 401) {
    return { status: 'invalid' }
  }
  if (!response.ok) {
    throw new Error(`Supabase Auth respondió con estado ${response.status}`)
  }

  const payload: unknown = await response.json()
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('user' in payload) ||
    typeof payload.user !== 'object' ||
    payload.user === null ||
    !('id' in payload.user) ||
    typeof payload.user.id !== 'string' ||
    !('email' in payload.user) ||
    typeof payload.user.email !== 'string'
  ) {
    throw new Error('Supabase Auth devolvió una respuesta inválida')
  }

  return {
    status: 'authenticated',
    user: { id: payload.user.id, email: payload.user.email.toLowerCase() },
  }
}
