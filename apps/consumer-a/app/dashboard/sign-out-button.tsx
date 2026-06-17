"use client"

import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"

export default function SignOutButton() {
  const router = useRouter()

  return (
    <button
      onClick={async () => {
        await authClient.signOut()
        router.push("/")
      }}
      className="self-start rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
    >
      Sign out
    </button>
  )
}
