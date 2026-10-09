import crypto from 'node:crypto'
import type { ILinkMessageItem } from '#contracts/weixin'

const MAX_MEDIA_BYTES = 100 * 1024 * 1024

type MediaReference = {
  encrypt_query_param?: unknown
  aes_key?: unknown
  full_url?: unknown
}

type MediaItem = {
  type?: unknown
  media?: MediaReference
  aeskey?: unknown
  file_name?: unknown
}

export async function downloadMedia(params: {
  item: ILinkMessageItem
  cdnBaseUrl: string
  timeoutMs?: number
  /** Use a provider-supplied full_url only for inbound media references. */
  preferFullUrl?: boolean
}) {
  const { media, itemData, fileName, contentType } = extractMedia(params.item)
  const fullUrl =
    params.preferFullUrl !== false && typeof media.full_url === 'string'
      ? media.full_url.trim()
      : ''
  const queryParam =
    typeof media.encrypt_query_param === 'string' ? media.encrypt_query_param.trim() : ''
  const url = fullUrl || buildDownloadUrl(params.cdnBaseUrl, queryParam)
  if (!url) throw new Error('media download reference is missing')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? 15_000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      const errorCode = response.headers.get('x-error-code')?.trim()
      const errorMessage = response.headers.get('x-error-message')?.trim()
      const detail = errorMessage || body.trim()
      const suffix = [errorCode && `code=${errorCode}`, detail && detail.slice(0, 256)]
        .filter(Boolean)
        .join(', ')
      throw new Error(
        `CDN download failed with HTTP ${response.status}${suffix ? ` (${suffix})` : ''}`
      )
    }
    const contentLength = Number(response.headers.get('content-length') || 0)
    if (contentLength > MAX_MEDIA_BYTES) throw new Error('media exceeds 100MB limit')
    const downloaded = Buffer.from(await response.arrayBuffer())
    if (downloaded.length > MAX_MEDIA_BYTES) throw new Error('media exceeds 100MB limit')

    const aesKey = resolveAesKey(itemData)
    const buffer = aesKey ? decryptAesEcb(downloaded, aesKey) : downloaded
    if (buffer.length > MAX_MEDIA_BYTES) throw new Error('decrypted media exceeds 100MB limit')
    return {
      buffer,
      contentType: response.headers.get('content-type')?.split(';')[0] || contentType,
      fileName,
    }
  } finally {
    clearTimeout(timeout)
  }
}

function extractMedia(item: ILinkMessageItem) {
  const type = mediaItemType(item)
  const itemData =
    type === 2
      ? (item.image_item as MediaItem | undefined)
      : type === 3
        ? (item.voice_item as MediaItem | undefined)
        : type === 4
          ? (item.file_item as MediaItem | undefined)
          : type === 5
            ? (item.video_item as MediaItem | undefined)
            : undefined
  if (!itemData?.media) throw new Error('message item is not downloadable media')

  return {
    media: itemData.media,
    itemData,
    fileName:
      typeof itemData.file_name === 'string' && itemData.file_name
        ? itemData.file_name
        : `weixin-media-${type}`,
    contentType:
      type === 2
        ? 'image/jpeg'
        : type === 3
          ? 'audio/silk'
          : type === 5
            ? 'video/mp4'
            : 'application/octet-stream',
  }
}

function mediaItemType(item: ILinkMessageItem) {
  const type = String(item.type ?? '').toLowerCase()
  if (type === '2' || type === 'image' || type === 'picture') return 2
  if (type === '3' || type === 'voice' || type === 'audio') return 3
  if (type === '4' || type === 'file' || type === 'document') return 4
  if (type === '5' || type === 'video') return 5
  if (item.image_item) return 2
  if (item.voice_item) return 3
  if (item.file_item) return 4
  if (item.video_item) return 5
  return 0
}

function resolveAesKey(item: MediaItem) {
  if (typeof item.aeskey === 'string' && /^[0-9a-fA-F]{32}$/.test(item.aeskey)) {
    return Buffer.from(item.aeskey, 'hex')
  }
  if (typeof item.media?.aes_key === 'string') {
    const key = Buffer.from(item.media.aes_key, 'base64')
    if (key.length === 16) return key
    if (key.length === 32 && /^[0-9a-fA-F]{32}$/.test(key.toString('ascii'))) {
      return Buffer.from(key.toString('ascii'), 'hex')
    }
  }
  return null
}

function buildDownloadUrl(cdnBaseUrl: string, encryptedQueryParam: string) {
  if (!encryptedQueryParam) return ''
  return `${cdnBaseUrl.replace(/\/+$/, '')}/download?encrypted_query_param=${encodeURIComponent(encryptedQueryParam)}`
}

function decryptAesEcb(ciphertext: Buffer, key: Buffer) {
  const decipher = crypto.createDecipheriv('aes-128-ecb', key, null)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}
