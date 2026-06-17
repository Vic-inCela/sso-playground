import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Consumer B — SSO Demo",
  description: "SSO Playground consumer-b relying-party app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
        <header className="border-b border-[var(--color-card-border)] bg-[var(--color-card)] px-6 py-4">
          <div className="mx-auto max-w-4xl flex items-center gap-3">
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-600" />
            <h1 className="text-xl font-bold tracking-tight text-emerald-600">
              Consumer B
            </h1>
            <span className="text-sm text-[var(--color-muted-foreground)]">
              SSO Playground — Trusted Client
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>
      </body>
    </html>
  )
}
