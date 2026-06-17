"use client"

import { authClient } from "@/lib/auth-client"

export function SignInButton() {
  return (
    <button
      onClick={() =>
        authClient.signIn.oauth2({
          providerId: "idp",
          callbackURL: "/dashboard",
        })
      }
      className="rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
    >
      Sign in with PlayHorny IdP
    </button>
  )
}
