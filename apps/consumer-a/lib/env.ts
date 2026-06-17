import { z } from "zod"

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  IDP_DISCOVERY_URL: z.string().url(),
  IDP_CLIENT_ID: z.string().min(1).default("consumer-a"),
  IDP_CLIENT_SECRET: z.string().min(1),
})

function parseEnv() {
  const result = serverEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    IDP_DISCOVERY_URL: process.env.IDP_DISCOVERY_URL,
    IDP_CLIENT_ID: process.env.IDP_CLIENT_ID,
    IDP_CLIENT_SECRET: process.env.IDP_CLIENT_SECRET,
  })

  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ")
    throw new Error(
      `Missing or invalid environment variables: ${missing}. ` +
        `Please set them in your .env.local file.`,
    )
  }

  return result.data
}

export const env = parseEnv()
