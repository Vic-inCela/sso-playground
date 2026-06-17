import { betterAuth } from "better-auth"
import { genericOAuth } from "better-auth/plugins"
import { nextCookies } from "better-auth/next-js"
import { createPgDatabase } from "@sso/auth"
import { env } from "@/lib/env"

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: createPgDatabase(env.DATABASE_URL),
  plugins: [
    genericOAuth({
      config: [
        // Interactive provider — shown when silent check found no IdP session
        {
          providerId: "idp",
          clientId: env.IDP_CLIENT_ID,
          clientSecret: env.IDP_CLIENT_SECRET,
          discoveryUrl: env.IDP_DISCOVERY_URL,
          scopes: ["openid", "profile", "email"],
          pkce: true,
        },
        // Silent provider — used on first landing to auto-detect an existing
        // IdP session without user interaction (prompt=none)
        {
          providerId: "idp-silent",
          clientId: env.IDP_CLIENT_ID,
          clientSecret: env.IDP_CLIENT_SECRET,
          discoveryUrl: env.IDP_DISCOVERY_URL,
          scopes: ["openid", "profile", "email"],
          pkce: true,
          prompt: "none",
        },
      ],
    }),
    // nextCookies() must be the LAST plugin
    nextCookies(),
  ],
})
