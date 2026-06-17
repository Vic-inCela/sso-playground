"use client"

import { Suspense, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { authClient } from "@/lib/auth-client"

function SplashChecking() {
  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-gray-400">Checking sign-in…</p>
    </div>
  )
}

function HomeInner() {
  const { data: session, isPending } = authClient.useSession()
  const sp = useSearchParams()
  // Guard against React Strict Mode's double-invoke of effects
  const silentTriggered = useRef(false)

  useEffect(() => {
    // Only fire if: no session, not loading, silent check not yet done, and we
    // haven't already triggered it in this render cycle.
    if (
      !isPending &&
      !session &&
      sp.get("sso") !== "none" &&
      !silentTriggered.current
    ) {
      silentTriggered.current = true
      authClient.signIn.oauth2({
        providerId: "idp-silent",
        callbackURL: "/",
        errorCallbackURL: "/?sso=none",
      })
    }
  }, [isPending, session, sp])

  // Still loading the session state from the server
  if (isPending) {
    return <SplashChecking />
  }

  // Authed — either was already signed in, or silent SSO just succeeded
  if (session) {
    return (
      <div className="flex flex-col items-start gap-6">
        <div>
          <h2 className="text-3xl font-semibold text-gray-900">
            You are signed in
          </h2>
          <p className="mt-1 text-gray-500">
            {session.user.name} &middot; {session.user.email}
          </p>
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            We auto-detected your IdP session and signed you in with a single
            silent redirect.
          </p>
        </div>

        <button
          onClick={() => authClient.signOut().then(() => location.reload())}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Sign out
        </button>
      </div>
    )
  }

  // No session AND silent check has already run (sso=none in URL)
  if (sp.get("sso") === "none") {
    return (
      <div className="flex flex-col items-start gap-6">
        <div>
          <h2 className="text-3xl font-semibold text-gray-900">
            Welcome to Consumer C
          </h2>
          <p className="mt-2 text-gray-500">
            No active IdP session was found. Sign in manually to continue.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Once signed in at the IdP, future visits to this page will
            authenticate you automatically — no button click needed.
          </p>
        </div>

        <button
          onClick={() =>
            authClient.signIn.oauth2({
              providerId: "idp",
              callbackURL: "/",
            })
          }
          className="rounded-lg bg-amber-500 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
        >
          Sign in with PlayHorny IdP
        </button>
      </div>
    )
  }

  // Silent check is about to fire (useEffect will redirect) — show splash
  return <SplashChecking />
}

export default function HomePage() {
  return (
    <Suspense fallback={<SplashChecking />}>
      <HomeInner />
    </Suspense>
  )
}
