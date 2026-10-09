type ClerkTokenGetter = () => Promise<string | null>
type ClerkSignOutHandler = () => Promise<void>

let getClerkToken: ClerkTokenGetter | null = null
let clerkSignOut: ClerkSignOutHandler | null = null

export function registerClerkSession(
  tokenGetter: ClerkTokenGetter,
  signOutHandler: ClerkSignOutHandler
) {
  getClerkToken = tokenGetter
  clerkSignOut = signOutHandler
}

export async function requestClerkToken() {
  return getClerkToken?.() ?? null
}

export async function signOutOfClerk() {
  await clerkSignOut?.()
}
