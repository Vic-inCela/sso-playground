import { betterAuth } from "better-auth"
import { oauthProvider } from "@better-auth/oauth-provider"
import { jwt } from "better-auth/plugins"
import { nextCookies } from "better-auth/next-js"
import { createPgDatabase } from "@sso/auth"
import { env } from "./env"
import { playhornyCredentials } from "./playhorny"

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: createPgDatabase(env.DATABASE_URL),
  emailAndPassword: {
    enabled: true,
  },
  account: {
    // Encrypt the backend token + refresh token at rest in the account row.
    // decryptOAuthToken() in lib/playhorny-token.ts undoes this on the server.
    encryptOAuthTokens: true,
  },
  // Avoid clash between the email/password sign-in path and /oauth2/token
  disabledPaths: ["/token"],
  plugins: [
    playhornyCredentials(),
    jwt(),
    oauthProvider({
      loginPage: "/sign-in",
      consentPage: "/consent",
      silenceWarnings: { oauthAuthServerConfig: true },
      // consumer-b and consumer-c are trusted and skip the consent screen
      cachedTrustedClients: new Set(["consumer-b", "consumer-c"]),
      // Demo only: store client secrets verbatim so the seed script can insert a
      // known secret that the token endpoint will accept without hashing.
      // Default would be "hashed" (because jwt() is enabled).
      // PRODUCTION: remove this override and register clients via dynamic
      // registration instead of a seed with fixed secrets.
      storeClientSecret: {
        hash: async (clientSecret: string) => clientSecret,
        verify: async (clientSecret: string, stored: string) =>
          clientSecret === stored,
      },
    }),
    // nextCookies() MUST be last
    nextCookies(),
  ],
  trustedOrigins: [
    env.CONSUMER_A_ORIGIN,
    env.CONSUMER_B_ORIGIN,
    ...(env.CONSUMER_C_ORIGIN ? [env.CONSUMER_C_ORIGIN] : []),
  ],
})
