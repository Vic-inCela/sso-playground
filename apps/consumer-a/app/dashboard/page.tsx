import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import SignOutButton from "./sign-out-button"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/")
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-indigo-600">
          This is a FIRST-PARTY session minted on consumer-a&apos;s own domain
          via the OIDC authorization-code redirect flow. The IdP issued an
          authorization code; consumer-a exchanged it for tokens and created
          its own session — independent of the IdP session.
        </p>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
          Session User
        </h3>
        <pre className="overflow-x-auto rounded-lg bg-white p-4 text-sm text-gray-800 shadow-inner">
          {JSON.stringify(
            {
              id: session.user.id,
              email: session.user.email,
              name: session.user.name,
            },
            null,
            2,
          )}
        </pre>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Full Session Object
        </h3>
        <pre className="overflow-x-auto rounded-lg bg-white p-4 text-sm text-gray-800 shadow-inner">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>

      <SignOutButton />
    </div>
  )
}
