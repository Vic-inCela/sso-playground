/**
 * Seed script for the IdP database.
 *
 * Run with:   pnpm seed   (from apps/idp — requires DATABASE_URL in your shell env)
 *
 * What it does:
 *  1. Creates the demo user (demo@sso.test / password1234) idempotently via
 *     auth.api.signUpEmail. Skips if the user already exists.
 *  2. Registers two OAuth clients (consumer-a, consumer-b) via better-auth's
 *     own data adapter so that string[] fields (redirectUris, grantTypes, etc.)
 *     are serialised exactly as the plugin reads them back.
 *
 * IMPORTANT: The oauth-provider plugin stores OAuth clients in the "oauthClient"
 * model. We use auth.$context.adapter (the same adapter the plugin uses) rather
 * than raw SQL to guarantee encoding consistency.
 *
 * The client_secret stored in the DB is the raw secret value because auth.ts
 * overrides storeClientSecret with an identity hash (demo mode only).
 * Consumer apps must set IDP_CLIENT_SECRET to the same value you pass in
 * CONSUMER_A_CLIENT_SECRET / CONSUMER_B_CLIENT_SECRET.
 */

import { auth } from "../lib/auth"

// Read env vars directly — do NOT import lib/env.ts here because zod will throw
// if any optional vars are missing in the seed context.
const {
  DATABASE_URL,
  CONSUMER_A_CLIENT_SECRET,
  CONSUMER_A_ORIGIN,
  CONSUMER_B_CLIENT_SECRET,
  CONSUMER_B_ORIGIN,
} = process.env

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is required")
  process.exit(1)
}
if (!CONSUMER_A_CLIENT_SECRET) {
  console.error("ERROR: CONSUMER_A_CLIENT_SECRET is required")
  process.exit(1)
}
if (!CONSUMER_A_ORIGIN) {
  console.error("ERROR: CONSUMER_A_ORIGIN is required")
  process.exit(1)
}
if (!CONSUMER_B_CLIENT_SECRET) {
  console.error("ERROR: CONSUMER_B_CLIENT_SECRET is required")
  process.exit(1)
}
if (!CONSUMER_B_ORIGIN) {
  console.error("ERROR: CONSUMER_B_ORIGIN is required")
  process.exit(1)
}

const DEMO_EMAIL = "demo@sso.test"
const DEMO_PASSWORD = "password1234"
const DEMO_NAME = "Demo User"

async function seedDemoUser() {
  console.log(`\n[1/2] Creating demo user (${DEMO_EMAIL}) ...`)

  try {
    // auth.api.signUpEmail will throw if the email already exists
    const result = await auth.api.signUpEmail({
      body: {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        name: DEMO_NAME,
      },
    })
    if (result.user) {
      console.log(`  ✓ Created user: ${result.user.id}`)
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : JSON.stringify(err)
    if (
      message.includes("already") ||
      message.includes("exists") ||
      message.includes("duplicate") ||
      message.includes("UNIQUE")
    ) {
      console.log("  ✓ Demo user already exists — skipping")
    } else {
      throw err
    }
  }
}

async function seedOAuthClients() {
  console.log("\n[2/2] Registering OAuth clients ...")

  // auth.$context is a Promise — await it to get the initialised context which
  // carries the same adapter instance the oauthProvider plugin uses at runtime.
  const ctx = await auth.$context

  const clients = [
    {
      clientId: "consumer-a",
      clientSecret: CONSUMER_A_CLIENT_SECRET as string,
      origin: CONSUMER_A_ORIGIN as string,
      skipConsent: false,
      name: "Consumer A",
    },
    {
      clientId: "consumer-b",
      clientSecret: CONSUMER_B_CLIENT_SECRET as string,
      origin: CONSUMER_B_ORIGIN as string,
      skipConsent: true,
      name: "Consumer B (trusted)",
    },
  ]

  for (const client of clients) {
    const callbackUri = `${client.origin}/api/auth/oauth2/callback/idp`

    // Idempotency: skip if the client already exists.
    const existing = await ctx.adapter.findOne<{ clientId: string }>({
      model: "oauthClient",
      where: [{ field: "clientId", value: client.clientId }],
    })

    if (existing) {
      await ctx.adapter.update({
        model: "oauthClient",
        where: [{ field: "clientId", value: client.clientId }],
        update: {
          redirectUris: [callbackUri],
          skipConsent: client.skipConsent,
          tokenEndpointAuthMethod: "client_secret_post",
          requirePKCE: true,
          public: false,
          disabled: false,
        },
      })
      console.log(`  ↻ Updated ${client.clientId}`)
      console.log(`      client_id:     ${client.clientId}`)
      console.log(`      redirect_uri:  ${callbackUri}`)
      continue
    }

    // Use the adapter so that string[] fields (redirectUris, grantTypes,
    // responseTypes, scopes) are encoded with the same serialisation the
    // plugin uses when reading them back. The adapter also generates id /
    // createdAt / updatedAt automatically.
    //
    // tokenEndpointAuthMethod is "client_secret_post" because better-auth's
    // genericOAuth plugin defaults authentication to "post" (see
    // dist/plugins/generic-oauth/types.d.mts line 144) and the two sides
    // must agree.
    await ctx.adapter.create({
      model: "oauthClient",
      data: {
        clientId: client.clientId,
        clientSecret: client.clientSecret,
        name: client.name,
        redirectUris: [callbackUri],
        grantTypes: ["authorization_code", "refresh_token"],
        responseTypes: ["code"],
        scopes: ["openid", "profile", "email"],
        tokenEndpointAuthMethod: "client_secret_post",
        skipConsent: client.skipConsent,
        requirePKCE: true,
        public: false,
        disabled: false,
      },
    })

    console.log(`  ✓ Registered ${client.clientId}`)
    console.log(`      client_id:     ${client.clientId}`)
    console.log(`      client_secret: ${client.clientSecret}`)
    console.log(`      redirect_uri:  ${callbackUri}`)
  }
}

async function main() {
  console.log("=== IdP Seed Script ===")

  await seedDemoUser()
  await seedOAuthClients()
  console.log("\nSeed complete.")
  process.exit(0)
}

main().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
