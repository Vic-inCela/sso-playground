import { z } from "zod"

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  IDP_DISCOVERY_URL: z.string().url(),
  IDP_CLIENT_ID: z.string().default("consumer-b"),
  IDP_CLIENT_SECRET: z.string().min(1),
})

function parseEnv() {
  const result = serverEnvSchema.safeParse(process.env)
  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ")
    throw new Error(
      `[consumer-b] Missing or invalid environment variables: ${missing}. ` +
        `Please create apps/consumer-b/.env.local with the required values.`
    )
  }
  return result.data
}

export const env = parseEnv()
