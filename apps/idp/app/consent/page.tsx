"use client"

import { useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import { authClient } from "@/lib/auth-client"

export default function ConsentPage() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const clientId = searchParams.get("client_id") ?? "unknown"
  const scope = searchParams.get("scope") ?? "openid profile email"
  const scopes = scope.split(" ").filter(Boolean)

  // Serialize the full signed query string (including sig, exp, etc.) to pass
  // back to the consent endpoint as oauth_query so the plugin can verify and
  // resume the authorization flow.
  const oauthQuery = searchParams.toString()

  function handleConsent(accept: boolean) {
    setError(null)
    startTransition(async () => {
      const result = await authClient.oauth2.consent({
        accept,
        oauth_query: oauthQuery,
      })

      if (result.error) {
        setError(result.error.message ?? "Consent failed. Please try again.")
        return
      }

      // The server returns a redirect_uri; follow it
      if (result.data && "url" in result.data) {
        window.location.href = result.data.url as string
      }
    })
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-lg border border-slate-100 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Authorize access</h1>

        <p className="mt-3 text-sm text-slate-600">
          <span className="font-semibold font-mono text-indigo-700">
            {clientId}
          </span>{" "}
          is requesting access to your account.
        </p>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Requested scopes
          </p>
          <ul className="mt-2 space-y-1">
            {scopes.map((s) => (
              <li
                key={s}
                className="flex items-center gap-2 text-sm text-slate-700"
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400" />
                <span className="font-mono">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => handleConsent(true)}
            disabled={isPending}
            className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? "Processing…" : "Approve"}
          </button>
          <button
            onClick={() => handleConsent(false)}
            disabled={isPending}
            className="flex-1 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      </div>
    </div>
  )
}
