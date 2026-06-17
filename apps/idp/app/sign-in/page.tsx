"use client"

import { Suspense } from "react"
import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authClient } from "@/lib/auth-client"

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Preserve any query params so better-auth can resume a pending /authorize flow
  const callbackURL = searchParams.get("callbackURL") ?? "/"

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL,
      })

      if (result.error) {
        setError(result.error.message ?? "Sign-in failed. Please try again.")
        return
      }

      // better-auth handles the redirect; if it doesn't (e.g. no callbackURL),
      // navigate to the home page
      router.push(callbackURL)
      router.refresh()
    })
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-lg border border-slate-100 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">
          Use your Identity Provider credentials to continue.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="demo@sso.test"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="password1234"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-400">
          Demo credentials: <span className="font-mono">demo@sso.test</span> /{" "}
          <span className="font-mono">password1234</span>
        </p>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-sm p-8 text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  )
}
