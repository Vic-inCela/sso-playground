"use client"

import { Suspense } from "react"
import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { TurnstileWidget } from "@/components/turnstile"

// ---------------------------------------------------------------------------
// Demo (email + password) sign-in form — keeps the existing SSO consumer demo
// working without any changes.
// ---------------------------------------------------------------------------

function DemoSignInForm() {
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
    <div className="rounded-lg border border-slate-100 bg-white p-8 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Demo account</h2>
      <p className="mt-1 text-sm text-slate-500">
        For SSO consumer demos only — use the demo IdP credentials below.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="demo-email"
            className="block text-sm font-medium text-slate-700"
          >
            Email
          </label>
          <input
            id="demo-email"
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
            htmlFor="demo-password"
            className="block text-sm font-medium text-slate-700"
          >
            Password
          </label>
          <input
            id="demo-password"
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
  )
}

// ---------------------------------------------------------------------------
// Playhorny account sign-in form
// ---------------------------------------------------------------------------

function PlayhornySignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [account, setAccount] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  // Bumping this number resets the Turnstile widget (tokens are single-use)
  const [resetSignal, setResetSignal] = useState(0)

  // Same callbackURL used by the demo form — ensures the /authorize flow resumes
  // identically after a successful playhorny login.
  const callbackURL = searchParams.get("callbackURL") ?? "/"

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await authClient.$fetch("/sign-in/playhorny", {
        method: "POST",
        body: {
          account,
          password,
          callbackURL,
          verifyCode: turnstileToken ?? undefined,
          codeResource: "turnstile",
        },
      })

      if (result.error) {
        const msg =
          (result.error as { message?: string }).message ??
          "登入失敗，請稍後再試"
        setError(msg)
        // Token is consumed on each attempt — reset widget and clear token
        setResetSignal((n) => n + 1)
        setTurnstileToken(null)
        return
      }

      const data = result.data as {
        redirect?: boolean
        url?: string
        token?: string
      } | null

      // Navigate to the callbackURL returned by the endpoint (which resumes the
      // OAuth /authorize flow), or fall back to the original callbackURL.
      const destination = data?.url ?? callbackURL
      router.push(destination)
      router.refresh()
    })
  }

  return (
    <div className="rounded-lg border border-orange-100 bg-white p-8 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Playhorny account</h2>
      <p className="mt-1 text-sm text-slate-500">
        Sign in with your playhorny back-office credentials.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="ph-account"
            className="block text-sm font-medium text-slate-700"
          >
            Account / Email
          </label>
          <input
            id="ph-account"
            type="text"
            autoComplete="username"
            placeholder="your@email.com"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div>
          <label
            htmlFor="ph-password"
            className="block text-sm font-medium text-slate-700"
          >
            Password
          </label>
          <input
            id="ph-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <TurnstileWidget onToken={setTurnstileToken} resetSignal={resetSignal} />

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || !turnstileToken}
          className="w-full rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {isPending ? "登入中…" : "登入"}
        </button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page — both forms on the same page, wrapped in Suspense (useSearchParams)
// ---------------------------------------------------------------------------

function SignInForms() {
  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">
          Choose your account type to continue.
        </p>
      </div>

      <PlayhornySignInForm />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-slate-50 px-2 text-slate-400">or</span>
        </div>
      </div>

      <DemoSignInForm />
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
      <SignInForms />
    </Suspense>
  )
}
