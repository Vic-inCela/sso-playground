import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Consumer A — SSO Playground",
  description: "Relying-party app A (indigo) demonstrating OIDC SSO via the IdP",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <header className="border-b border-indigo-100 bg-indigo-50 px-6 py-4">
          <h1 className="text-2xl font-bold tracking-tight text-indigo-700">
            Consumer App A
          </h1>
          <p className="mt-0.5 text-sm text-indigo-500">
            Relying party — shows consent screen
          </p>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
      </body>
    </html>
  )
}
