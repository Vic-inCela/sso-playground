import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import Link from "next/link"
import { SignInButton } from "./sign-in-button"
import { SignOutButton } from "./sign-out-button"

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center gap-8 py-24 text-center">
        <div className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold tracking-tight">
            Welcome to Consumer B
          </h2>
          <p className="text-[var(--color-muted-foreground)] max-w-sm">
            This is a trusted OIDC relying-party. Sign in via the PlayHorny IdP
            — no consent screen is shown because this app is a trusted client.
          </p>
        </div>
        <SignInButton />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Signed in as
            </p>
            <p className="text-lg font-semibold">{session.user.name}</p>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {session.user.email}
            </p>
          </div>
          <SignOutButton />
        </div>
      </div>
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
