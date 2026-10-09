import encryption from '@adonisjs/core/services/encryption'

export function encryptSecret(value: string): string {
  return encryption.use('gcm').encrypt(value)
}

export function decryptSecret(value: string): string {
  const decrypted = encryption.use('gcm').decrypt(value)
  if (typeof decrypted !== 'string') {
    throw new Error('encrypted secret did not contain a string')
  }
  return decrypted
}
