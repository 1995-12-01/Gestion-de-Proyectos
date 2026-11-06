'use client'

import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/auth/login' })}
      className="inline-flex h-9 items-center gap-2 rounded-md border bg-white px-3 text-sm font-medium hover:bg-slate-50"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Cerrar sesión
    </button>
  )
}
