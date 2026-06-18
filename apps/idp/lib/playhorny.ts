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
  } catch (e) {
    console.error("[playhorny] fetch error", { message: String(e) })
    throw new APIError("INTERNAL_SERVER_ERROR", {
      message: "登入失敗，請稍後再試",
    })
  }

  // Read as text first so a non-JSON body can be logged
  const text = await res.text()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: Record<string, any>
  try {
    body = JSON.parse(text)
  } catch {
    console.error("[playhorny] non-JSON upstream response", {
      status: res.status,
      bodySnippet: text.slice(0, 300),
    })
    throw new APIError("INTERNAL_SERVER_ERROR", {
      message: "登入失敗 (upstream returned non-JSON, status " + res.status + ")",
    })
  }

  // Field-casing tolerant extraction (snake_case OR camelCase)
  const result = body.result ?? body
  const code: number | undefined = result?.code
  const data: Record<string, unknown> = (body.data as Record<string, unknown>) ?? {}
  const userInfo: Record<string, unknown> =
    (data.user_info as Record<string, unknown>) ??
    (data.userInfo as Record<string, unknown>) ??
    {}
  const token = data.token as string | undefined
  const refreshToken =
    (data.refresh_token as string | undefined) ??
    (data.refreshToken as string | undefined)
  const userId =
    (userInfo.user_id as string | undefined) ??
    (userInfo.userId as string | undefined)
  const nickname = userInfo.nickname as string | undefined
  const upstreamEmail = userInfo.email as string | undefined

  // Always log one diagnostic line (keys + code + msg only — no values)
  console.log("[playhorny] upstream /users/login", {
    status: res.status,
    code,
    msg: result?.msg,
    dataKeys: Object.keys(data),
    userInfoKeys: Object.keys(userInfo),
  })

  // SECURITY: never log token / refreshToken / password values — only keys,
  // status, code, and msg are logged above.

  // 1. code === 1 → SUCCESS (regardless of HTTP status)
  if (code === 1) {
    if (!token || !userId) {
      console.error("[playhorny] missing token or user id", {
        dataKeys: Object.keys(data),
        userInfoKeys: Object.keys(userInfo),
      })
      throw new APIError("INTERNAL_SERVER_ERROR", {
        message: "登入失敗 (missing token or user id)",
      })
    }

    // Normalise email: use upstream email, or treat account as email if it
    // looks like one, or synthesise a placeholder.
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(opts.account)
    const email =
      upstreamEmail ||
      (looksLikeEmail ? opts.account : `${userId}@playhorny.local`)

    const name = nickname || upstreamEmail || opts.account

    return {
      token,
      refreshToken: refreshToken ?? "",
      user: { id: userId, name, email },
    }
  }

  // 2. code !== undefined but !== 1 → known/unknown logical failure (e.g. 301
  //    bad credentials).  Return a clean 401 with the mapped message regardless
  //    of HTTP status so callers never see a confusing 500 for auth errors.
  if (code !== undefined) {
    throw new APIError("UNAUTHORIZED", {
      message: CODE_MESSAGES[code] ?? "登入失敗 (code " + code + ")",
    })
  }

  // 3. code === undefined → no parseable logical code; fall back to HTTP status
  if (!res.ok) {
    throw new APIError("INTERNAL_SERVER_ERROR", {
      message: "登入失敗 (upstream HTTP " + res.status + ")",
    })
  }

  console.error("[playhorny] unexpected response shape", {
    dataKeys: Object.keys(data),
    userInfoKeys: Object.keys(userInfo),
  })
  throw new APIError("INTERNAL_SERVER_ERROR", {
    message: "登入失敗 (unexpected response shape)",
  })
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
