import { createAuthEndpoint, APIError } from "better-auth/api"
import { setSessionCookie } from "better-auth/cookies"
import { setTokenUtil } from "better-auth/oauth2"
import type { BetterAuthPlugin } from "better-auth"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Error code → human-readable message
// ---------------------------------------------------------------------------

const CODE_MESSAGES: Record<number, string> = {
  301: "帳號或密碼錯誤",
  302: "查無此帳號",
  305: "帳號已鎖定",
  308: "此帳號需綁定 OTP",
  309: "請輸入 OTP 驗證碼",
  310: "OTP 驗證失敗",
  321: "請求過於頻繁",
  334: "驗證碼錯誤",
  343: "IP 已被封鎖",
}

// ---------------------------------------------------------------------------
// Upstream login helper
// ---------------------------------------------------------------------------

export interface PlayhornyUser {
  id: string
  name: string
  email: string
}

export interface PlayhornyLoginResult {
  token: string
  refreshToken: string
  user: PlayhornyUser
}

/**
 * Call the playhorny backend login endpoint and return the backend token +
 * normalised user info.  Throws APIError on any failure.
 *
 * TODO: implement /users/refresh/token (v2) — refresh-token rotation is out
 * of scope for v1.
 */
export async function loginUpstream(opts: {
  account: string
  password: string
  verifyCode?: string
  codeResource?: string
}): Promise<PlayhornyLoginResult> {
  const apiBase = process.env.API_BASE_URL_LOGIN
  if (!apiBase) {
    throw new APIError("BAD_REQUEST", {
      message: "Playhorny login is not configured (API_BASE_URL_LOGIN missing)",
    })
  }

  const authKindRaw = process.env.AUTH_LOGIN_AUTH_KIND
  const authKind = authKindRaw ? parseInt(authKindRaw, 10) : 1
  const clientId = process.env.AUTH_LOGIN_CLIENT_ID ?? ""
  const requestSource = process.env.AUTH_REQUEST_SOURCE ?? "Web"
  const wafValue = process.env.UPSTREAM_WAF_HEADER_VALUE

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Request-Source": requestSource,
  }

  if (wafValue) {
    headers["horny-truedau"] = wafValue
  }

  if (opts.verifyCode) {
    if (opts.codeResource === "recaptcha") {
      headers["Recaptcha-Token"] = opts.verifyCode
    } else {
      headers["Turnstile-Token"] = opts.verifyCode
    }
  }

  let res: Response
  try {
    res = await fetch(`${apiBase}/users/login`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        auth_kind: authKind,
        account: opts.account,
        password: opts.password,
        client_id: clientId,
        auth_client_id: "",
        ip: "",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new APIError("INTERNAL_SERVER_ERROR", {
      message: "登入失敗，請稍後再試",
    })
  }

  if (!res.ok) {
    throw new APIError("INTERNAL_SERVER_ERROR", {
      message: "登入失敗，請稍後再試",
    })
  }

  let body: {
    result: { code: number; msg: string; http_code?: string }
    data: {
      token: string
      refresh_token: string
      user_info: { user_id: string; nickname?: string; email?: string }
    }
  }

  try {
    body = await res.json()
  } catch {
    throw new APIError("INTERNAL_SERVER_ERROR", {
      message: "登入失敗，請稍後再試",
    })
  }

  if (body.result.code !== 1) {
    const msg =
      CODE_MESSAGES[body.result.code] ?? "帳號或密碼錯誤"
    throw new APIError("UNAUTHORIZED", { message: msg })
  }

  const { user_info, token, refresh_token } = body.data
  const { user_id, nickname, email: upstreamEmail } = user_info

  // Normalise email: use upstream email, or treat account as email if it
  // looks like one, or synthesise a placeholder.
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(opts.account)
  const email =
    upstreamEmail ||
    (looksLikeEmail ? opts.account : `${user_id}@playhorny.local`)

  const name = nickname || upstreamEmail || opts.account

  return {
    token,
    refreshToken: refresh_token,
    user: { id: user_id, name, email },
  }
}

// ---------------------------------------------------------------------------
// better-auth plugin
// ---------------------------------------------------------------------------

export function playhornyCredentials(): BetterAuthPlugin {
  return {
    id: "playhorny-credentials",
    endpoints: {
      signInPlayhorny: createAuthEndpoint(
        "/sign-in/playhorny",
        {
          method: "POST",
          body: z.object({
            account: z.string().min(1),
            password: z.string().min(1),
            callbackURL: z.string().optional(),
            verifyCode: z.string().optional(),
            codeResource: z.string().optional(),
          }),
        },
        async (ctx) => {
          const { account, password, callbackURL, verifyCode, codeResource } =
            ctx.body

          // Will throw APIError on any failure (unconfigured / bad credentials)
          const upstream = await loginUpstream({
            account,
            password,
            verifyCode,
            codeResource,
          })

          const adapter = ctx.context.internalAdapter

          // ------------------------------------------------------------------
          // Find or create the local user record
          // ------------------------------------------------------------------
          let userId: string
          let dbUser: { id: string; name: string; email: string }

          const existing = await adapter.findUserByEmail(upstream.user.email, {
            includeAccounts: true,
          })

          if (existing) {
            userId = existing.user.id
            dbUser = {
              id: existing.user.id,
              name: existing.user.name,
              email: existing.user.email,
            }

            // Update the playhorny account row (refresh token/access token)
            const playhornyAccount = existing.accounts.find(
              (a) => a.providerId === "playhorny",
            )
            if (playhornyAccount) {
              await adapter.updateAccount(playhornyAccount.id, {
                accessToken: await setTokenUtil(
                  upstream.token,
                  ctx.context,
                ),
                refreshToken: await setTokenUtil(
                  upstream.refreshToken,
                  ctx.context,
                ),
              })
            } else {
              // First time signing in via playhorny on an existing email account
              await adapter.linkAccount({
                userId,
                providerId: "playhorny",
                accountId: upstream.user.id,
                accessToken: await setTokenUtil(upstream.token, ctx.context),
                refreshToken: await setTokenUtil(
                  upstream.refreshToken,
                  ctx.context,
                ),
              })
            }
          } else {
            // Brand-new user
            const newUser = await adapter.createUser({
              email: upstream.user.email,
              name: upstream.user.name,
              emailVerified: true,
            })
            userId = newUser.id
            dbUser = { id: newUser.id, name: newUser.name, email: newUser.email }

            await adapter.linkAccount({
              userId,
              providerId: "playhorny",
              accountId: upstream.user.id,
              accessToken: await setTokenUtil(upstream.token, ctx.context),
              refreshToken: await setTokenUtil(
                upstream.refreshToken,
                ctx.context,
              ),
            })
          }

          // ------------------------------------------------------------------
          // Create session + set cookie
          // ------------------------------------------------------------------
          const session = await adapter.createSession(userId, false)

          await setSessionCookie(ctx, { session, user: dbUser as never }, false)

          return ctx.json({
            redirect: !!callbackURL,
            token: session.token,
            url: callbackURL,
            user: dbUser,
          })
        },
      ),
    },
  } satisfies BetterAuthPlugin
}
