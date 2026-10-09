declare global {
  interface Window {
    __ASA_CONFIG__?: {
      clerkPublishableKey?: string
    }
  }
}

export const CLERK_PUBLISHABLE_KEY =
  window.__ASA_CONFIG__?.clerkPublishableKey ||
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  ''
