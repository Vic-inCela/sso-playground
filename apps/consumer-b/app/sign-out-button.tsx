"use client"

import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"

export function SignOutButton() {
  const router = useRouter()
  return (
    <button
      onClick={async () => {
        await authClient.signOut()
        router.push("/")
        router.refresh()
      }}
      className="rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
    >
      Sign out
    </button>
  )
}
