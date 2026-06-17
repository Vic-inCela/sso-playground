import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Consumer C — Auto SSO",
  description: "Relying-party app C (amber) demonstrating silent redirect-based SSO via the IdP",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <header className="border-b border-amber-100 bg-amber-50 px-6 py-4">
          <h1 className="text-2xl font-bold tracking-tight text-amber-700">
            Consumer App C
          </h1>
          <p className="mt-0.5 text-sm text-amber-500">
            Auto-detects your IdP session (silent SSO)
          </p>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
      </body>
    </html>
  )
}
