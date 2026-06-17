import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "SSO Identity Provider",
  description: "Central OpenID Connect Identity Provider for the SSO demo",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        <header className="bg-indigo-700 text-white shadow-sm">
          <div className="mx-auto max-w-4xl px-4 py-3 flex items-center gap-3">
            <span className="text-lg font-semibold tracking-tight">
              SSO Identity Provider
            </span>
            <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-medium">
              IdP
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
