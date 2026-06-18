"use client"

import { useEffect, useRef } from "react"

// ---------------------------------------------------------------------------
// Global type declaration for the Cloudflare Turnstile JS API
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        params: {
          sitekey: string
          callback: (token: string) => void
          "error-callback"?: () => void
          "expired-callback"?: () => void
        },
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
    // Turnstile calls this once the script is ready when render=explicit
    onloadTurnstileCallback?: () => void
  }
}

// ---------------------------------------------------------------------------
// TurnstileWidget component
// ---------------------------------------------------------------------------

const SCRIPT_ID = "cf-turnstile-script"
const SITEKEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA"

interface TurnstileWidgetProps {
  /**
   * Called with the Turnstile token on success, and with `null` on expiry or
   * error (so the parent can clear any stored token and disable submit).
   */
  onToken: (token: string | null) => void
  /**
   * Bump this number to reset the widget (e.g. after a failed login attempt,
   * since Turnstile tokens are single-use).
   */
  resetSignal?: number
}

export function TurnstileWidget({ onToken, resetSignal = 0 }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  // Render the widget once the Turnstile script is ready
  function renderWidget() {
    if (!containerRef.current || !window.turnstile) return

    // Remove any previous widget before rendering a fresh one
    if (widgetIdRef.current !== null) {
      try {
        window.turnstile.remove(widgetIdRef.current)
      } catch {
        // ignore if already gone
      }
      widgetIdRef.current = null
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITEKEY,
      callback: (token: string) => onToken(token),
      "error-callback": () => onToken(null),
      "expired-callback": () => onToken(null),
    })
  }

  // Inject the Turnstile script once (idempotent)
  useEffect(() => {
    if (typeof window === "undefined") return

    // If the script is already loaded and turnstile is ready, render now
    if (window.turnstile) {
      renderWidget()
      return
    }

    // Install the onload callback before injecting the script
    window.onloadTurnstileCallback = () => {
      renderWidget()
    }

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script")
      script.id = SCRIPT_ID
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onloadTurnstileCallback"
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    return () => {
      // Clean up the widget (not the script — it can stay cached)
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // ignore
        }
        widgetIdRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reset the widget whenever resetSignal changes (after initial mount)
  useEffect(() => {
    if (resetSignal === 0) return
    if (widgetIdRef.current !== null && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current)
    }
  }, [resetSignal])

  return <div ref={containerRef} />
}
