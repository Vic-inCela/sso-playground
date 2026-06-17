import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { SignOutButton } from "../sign-out-button"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <SignOutButton />
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <strong>First-party session on consumer-b:</strong> This session was
        minted directly on consumer-b&apos;s own domain via the OIDC
        authorization-code redirect flow. The IdP issued an ID token; consumer-b
        exchanged it for its own local session — no cross-domain cookies needed.
        Consumer-b is a <strong>trusted client</strong>, so the consent screen
        was skipped automatically.
      </div>

      <div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
          Session user
        </h3>
        <pre className="overflow-x-auto rounded-lg bg-[var(--color-muted)] p-4 text-sm leading-relaxed">
          {JSON.stringify(
            {
              id: session.user.id,
              email: session.user.email,
              name: session.user.name,
              emailVerified: session.user.emailVerified,
            },
            null,
            2
          )}
        </pre>
      </div>

      <div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
          Full session
        </h3>
        <pre className="overflow-x-auto rounded-lg bg-[var(--color-muted)] p-4 text-sm leading-relaxed">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>
    </div>
  )
}
