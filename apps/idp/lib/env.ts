import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  CONSUMER_A_CLIENT_SECRET: z.string().min(1),
  CONSUMER_A_ORIGIN: z.string().url(),
  CONSUMER_B_CLIENT_SECRET: z.string().min(1),
  CONSUMER_B_ORIGIN: z.string().url(),
  CONSUMER_C_CLIENT_SECRET: z.string().min(1).optional(),
  CONSUMER_C_ORIGIN: z.string().url().optional(),
  // Playhorny upstream login — all optional so startup never breaks when unset
  API_BASE_URL_LOGIN: z.string().url().optional(),
  AUTH_LOGIN_CLIENT_ID: z.string().optional(),
  AUTH_LOGIN_AUTH_KIND: z.string().optional(),
  AUTH_REQUEST_SOURCE: z.string().optional(),
  UPSTREAM_WAF_HEADER_VALUE: z.string().optional(),
})

function parseEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ")
    throw new Error(
      `[IdP] Missing or invalid environment variables: ${missing}\n` +
        "Please set them in your .env.local file.",
    )
  }
  return result.data
}

export const env = parseEnv()
