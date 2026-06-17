import { Pool } from "pg"

/**
 * Creates a pg Pool for use with better-auth's database adapter.
 * Each app (idp, consumer-a, consumer-b) should create its own pool
 * using the DATABASE_URL from its own env.
 */
export function createPgDatabase(connectionString: string): Pool {
  return new Pool({ connectionString })
}

/**
 * Shared user shape returned by the IdP's /userinfo endpoint and
 * included in session objects across all consumer apps.
 */
export interface SsoUser {
  id: string
  email: string
  name: string
  emailVerified: boolean
}

/**
 * Minimal OIDC claims shape emitted by the IdP.
 */
export interface OidcClaims {
  sub: string
  email: string
  name: string
  email_verified: boolean
}
