"use client"

import { authClient } from "@/lib/auth-client"
import Link from "next/link"

export default function HomePage() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Loading session…</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex flex-col items-start gap-6">
        <div>
          <h2 className="text-3xl font-semibold text-gray-900">
            Welcome to Consumer A
          </h2>
          <p className="mt-2 text-gray-500">
            Sign in with the PlayHorny IdP to access your dashboard. You will
            be shown a consent screen before the IdP grants access.
          </p>
        </div>

        <button
          onClick={() =>
            authClient.signIn.oauth2({
              providerId: "idp",
              callbackURL: "/dashboard",
            })
          }
          className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
        >
          Sign in with PlayHorny IdP
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-6">
      <div>
        <h2 className="text-3xl font-semibold text-gray-900">
          You are signed in
        </h2>
        <p className="mt-1 text-gray-500">
          {session.user.name} &middot; {session.user.email}
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Go to dashboard
        </Link>
        <button
          onClick={() => authClient.signOut()}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
