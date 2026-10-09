import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { ILinkMessageItem } from '#contracts/weixin'
import type ILinkClient from './ilink_client.js'

export const mediaTypes = ['image', 'video', 'file'] as const
export type WeixinMediaType = (typeof mediaTypes)[number]

const uploadMediaType: Record<WeixinMediaType, number> = {
  image: 1,
  video: 2,
  file: 3,
}

/**
 * Keep the CDNMedia wire encoding aligned with openclaw-weixin.
 *
 * The upload API receives the raw key as a hex string, and the key embedded in
 * the outgoing media item is base64 of that hex string (not base64 of the raw
 * 16 bytes). Both values represent the same AES key, but the iLink client
 * expects this exact representation in the media payload.
 */
function encodeMediaAesKey(aesKey: Buffer) {
  return Buffer.from(aesKey.toString('hex'), 'utf8').toString('base64')
}

export function aesEcbPaddedSize(plaintextSize: number) {
  return Math.ceil((plaintextSize + 1) / 16) * 16
}

export function encryptAesEcb(plaintext: Buffer, key: Buffer) {
  const cipher = crypto.createCipheriv('aes-128-ecb', key, null)
  return Buffer.concat([cipher.update(plaintext), cipher.final()])
}

function buildUploadUrl(cdnBaseUrl: string, uploadParam: string, filekey: string) {
  return new URL(
    `${cdnBaseUrl.replace(/\/+$/, '')}/upload?encrypted_query_param=${encodeURIComponent(uploadParam)}&filekey=${encodeURIComponent(filekey)}`
  )
}

async function uploadEncrypted(
  cdnBaseUrl: string,
  uploadParam: string | undefined,
  uploadFullUrl: string | undefined,
  filekey: string,
  plaintext: Buffer,
  aesKey: Buffer
) {
  const uploadUrl = uploadFullUrl?.trim()
    ? new URL(uploadFullUrl)
    : uploadParam
      ? buildUploadUrl(cdnBaseUrl, uploadParam, filekey)
      : null
  if (!uploadUrl) throw new Error('iLink upload URL is missing')

  const ciphertext = encryptAesEcb(plaintext, aesKey)
  let lastError: unknown
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: new Uint8Array(ciphertext),
      })
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`CDN upload rejected with HTTP ${response.status}`)
      }
      if (response.status !== 200) {
        throw new Error(`CDN upload failed with HTTP ${response.status}`)
      }
      const downloadParam = response.headers.get('x-encrypted-param')
      if (!downloadParam) throw new Error('CDN upload response missing x-encrypted-param')
      return { downloadParam, ciphertextSize: ciphertext.length }
    } catch (error) {
      lastError = error
      if (error instanceof Error && error.message.includes('rejected')) throw error
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 250 * attempt))
    }
  }
  throw lastError instanceof Error ? lastError : new Error('CDN upload failed')
}

function mediaItem(
  type: WeixinMediaType,
  fileName: string,
  downloadParam: string,
  aesKey: Buffer,
  rawSize: number,
  ciphertextSize: number
): ILinkMessageItem {
  const media = {
    encrypt_query_param: downloadParam,
    aes_key: encodeMediaAesKey(aesKey),
    encrypt_type: 1,
  }

  if (type === 'image') {
    return { type: 2, image_item: { media, mid_size: ciphertextSize } }
  }
  if (type === 'video') {
    return { type: 5, video_item: { media, video_size: ciphertextSize } }
  }
  return {
    type: 4,
    file_item: { media, file_name: fileName, len: String(rawSize) },
  }
}

export async function uploadAndSendMedia(params: {
  client: ILinkClient
  cdnBaseUrl: string
  filePath: string
  fileName?: string
  mediaType: WeixinMediaType
  toUserId: string
  caption?: string
  contextToken?: string
  clientMessageId?: string
  runId?: string
}) {
  const plaintext = await fs.readFile(params.filePath)
  if (plaintext.length === 0) throw new Error('media file cannot be empty')

  const aesKey = crypto.randomBytes(16)
  const filekey = crypto.randomBytes(16).toString('hex')
  const uploadUrl = await params.client.getUploadUrl({
    filekey,
    mediaType: uploadMediaType[params.mediaType],
    toUserId: params.toUserId,
    rawSize: plaintext.length,
    rawFileMd5: crypto.createHash('md5').update(plaintext).digest('hex'),
    fileSize: aesEcbPaddedSize(plaintext.length),
    aesKey: aesKey.toString('hex'),
  })
  const uploaded = await uploadEncrypted(
    params.cdnBaseUrl,
    uploadUrl.upload_param,
    uploadUrl.upload_full_url,
    filekey,
    plaintext,
    aesKey
  )

  const item = mediaItem(
    params.mediaType,
    path.basename(params.fileName || params.filePath),
    uploaded.downloadParam,
    aesKey,
    plaintext.length,
    uploaded.ciphertextSize
  )
  if (params.caption) {
    await params.client.sendMessage({
      from_user_id: '',
      to_user_id: params.toUserId,
      message_type: 2,
      message_state: 2,
      item_list: [{ type: 1, text_item: { text: params.caption } }],
      ...(params.contextToken ? { context_token: params.contextToken } : {}),
      ...(params.runId ? { run_id: params.runId } : {}),
    })
  }
  const sent = await params.client.sendMessage({
    from_user_id: '',
    to_user_id: params.toUserId,
    message_type: 2,
    message_state: 2,
    item_list: [item],
    ...(params.contextToken ? { context_token: params.contextToken } : {}),
    ...(params.clientMessageId ? { client_id: params.clientMessageId } : {}),
    ...(params.runId ? { run_id: params.runId } : {}),
  })

  return {
    clientId: sent.clientId,
    mediaType: params.mediaType,
    fileName: path.basename(params.fileName || params.filePath),
    rawSize: plaintext.length,
    ciphertextSize: uploaded.ciphertextSize,
    item,
  }
}
