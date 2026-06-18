/**
 * Server-only helper: retrieve the decrypted playhorny backend access token
 * for the currently authenticated user.
 *
 * The token is stored encrypted in the "account" table (providerId =
 * "playhorny") when `account.encryptOAuthTokens: true` is set in the
 * betterAuth config.  It is NEVER returned to the client.
 */

import { headers } from "next/headers"
import { auth } from "./auth"
import { decryptOAuthToken } from "better-auth/oauth2"

/**
 * Returns the decrypted backend access token for the signed-in user, or
 * `null` when the user is not signed in or has no playhorny account row.
 *
 * Usage (server component / route handler only):
 *
 *   const token = await getPlayhornyAccessToken()
 *   if (!token) redirect("/sign-in")
 *   // forward token to upstream API call
 */
export async function getPlayhornyAccessToken(): Promise<string | null> {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  if (!session) return null

  // TODO: better-auth does not expose a first-class server-side method for
  // decrypting account tokens outside of an endpoint context.  We reach into
  // the resolved $context directly here.  If a future version ships a
  // dedicated `auth.api.getAccountToken()` helper, prefer that instead.

  // auth.$context is an AsyncLocalStorage-backed promise in better-auth ≥ 1.x
  const ctx = await (auth as unknown as { $context: Promise<unknown> }).$context

  const authCtx = ctx as {
    internalAdapter: {
      findAccountByUserId(userId: string): Promise<
        Array<{
          id: string
          providerId: string
          accessToken?: string | null
        }>
      >
    }
    options: Record<string, unknown>
    secretConfig: unknown
  }

  const accounts = await authCtx.internalAdapter.findAccountByUserId(
    session.user.id,
  )

  const playhornyAccount = accounts.find((a) => a.providerId === "playhorny")
  if (!playhornyAccount || !playhornyAccount.accessToken) return null

  const rawToken = playhornyAccount.accessToken

  try {
    const decrypted = await decryptOAuthToken(
      rawToken,
      authCtx as Parameters<typeof decryptOAuthToken>[1],
    )
    return decrypted ?? null
  } catch {
    // If decryption fails (e.g., token is already plaintext in dev), return as-is
    return rawToken
  }
}
