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
        {
          providerId: "idp",
          clientId: env.IDP_CLIENT_ID,
          clientSecret: env.IDP_CLIENT_SECRET,
          discoveryUrl: env.IDP_DISCOVERY_URL,
          scopes: ["openid", "profile", "email"],
          pkce: true,
        },
      ],
    }),
    // nextCookies() must be the last plugin
    nextCookies(),
  ],
})
