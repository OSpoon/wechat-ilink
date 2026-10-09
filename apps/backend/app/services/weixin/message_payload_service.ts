import { decryptSecret, encryptSecret } from './secret_service.js'

/** Store protocol payloads encrypted while keeping legacy plaintext rows readable. */
export function encodeMessagePayload(value: unknown) {
  return encryptSecret(JSON.stringify(value))
}

export function decodeMessagePayload<T>(value: string): T {
  try {
    return JSON.parse(value) as T
  } catch {
    try {
      return JSON.parse(decryptSecret(value)) as T
    } catch {
      return value as T
    }
  }
}
