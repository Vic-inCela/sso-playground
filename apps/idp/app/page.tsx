import { headers } from "next/headers"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { SignOutButton } from "@/components/sign-out-button"

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() })

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-indigo-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Identity Provider
        </h1>
        <p className="mt-2 text-slate-600">
          This is the central OpenID Connect Identity Provider (IdP). Consumer
          apps (consumer-a, consumer-b) delegate authentication here via the
          OIDC authorization-code flow. A user who signs in here is
          automatically recognized by all registered consumer apps without
          re-entering credentials.
        </p>
      </div>

      {session ? (
        <div className="rounded-lg border border-green-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Signed in as
          </h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="w-32 font-medium text-slate-500">Name</dt>
              <dd className="text-slate-900">{session.user.name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 font-medium text-slate-500">Email</dt>
              <dd className="text-slate-900">{session.user.email}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 font-medium text-slate-500">User ID</dt>
              <dd className="font-mono text-xs text-slate-500">
                {session.user.id}
              </dd>
            </div>
          </dl>
          <div className="mt-4">
            <SignOutButton />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-slate-600">You are not signed in.</p>
          <Link
            href="/sign-in"
            className="mt-3 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Sign in
          </Link>
        </div>
      )}

      <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Registered OAuth Clients
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li>
            <span className="font-mono font-medium">consumer-a</span> — shows
            consent screen (standard client)
          </li>
          <li>
            <span className="font-mono font-medium">consumer-b</span> — skips
            consent screen (trusted client)
          </li>
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          Run <code className="font-mono">pnpm seed</code> in apps/idp to
          register these clients in the database.
        </p>
      </div>
    </div>
  )
}
