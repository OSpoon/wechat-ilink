import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import app from '@adonisjs/core/services/app'
import env from '#start/env'
import type { ILinkMessageItem } from '#contracts/weixin'

export type LocalMediaReference = {
  storageKey: string
  fileName: string
  contentType: string
  size: number
}

export type LocalMediaFile = LocalMediaReference & { buffer: Buffer }

const DEFAULT_MEDIA_ROOT = app.makePath('data', 'media')
const MAX_LOCAL_MEDIA_BYTES = 100 * 1024 * 1024

export async function storeOutboundMedia(params: {
  accountId: string
  messageId: string
  itemIndex: number
  filePath: string
  fileName: string
  contentType?: string
  size: number
}) {
  const fileName = safeFileName(params.fileName)
  const storageKey = path.posix.join(
    'outbound',
    safePathPart(params.accountId),
    safePathPart(params.messageId),
    `${params.itemIndex}-${randomUUID()}-${fileName}`
  )
  const targetPath = resolveStoragePath(storageKey)

  await mkdir(path.dirname(targetPath), { recursive: true })
  await copyFile(params.filePath, targetPath)

  return {
    storageKey,
    fileName,
    contentType: params.contentType || 'application/octet-stream',
    size: params.size,
  } satisfies LocalMediaReference
}

export async function readLocalMedia(reference: LocalMediaReference): Promise<LocalMediaFile> {
  const normalizedKey = normalizeStorageKey(reference.storageKey)
  const filePath = resolveStoragePath(normalizedKey)
  const [buffer, file] = await Promise.all([readFile(filePath), stat(filePath)])
  if (file.size > MAX_LOCAL_MEDIA_BYTES) throw new Error('local media exceeds 100MB limit')

  return {
    storageKey: normalizedKey,
    fileName: reference.fileName || 'media-file',
    contentType: reference.contentType || 'application/octet-stream',
    size: file.size,
    buffer,
  }
}

export async function removeLocalMedia(reference: LocalMediaReference) {
  await rm(resolveStoragePath(normalizeStorageKey(reference.storageKey)), { force: true })
}

export async function removeLocalMediaForAccount(accountId: string) {
  const accountStorageKey = path.posix.join('outbound', safePathPart(accountId))
  await rm(resolveStoragePath(accountStorageKey), { recursive: true, force: true })
}

export function attachLocalMediaReference(
  item: ILinkMessageItem,
  reference: LocalMediaReference
): ILinkMessageItem {
  const storedItem = structuredClone(item) as ILinkMessageItem
  const itemData = mediaItemData(storedItem)
  if (!itemData) throw new Error('sent media item is missing its media payload')
  itemData.media = {
    ...(itemData.media || {}),
    local_storage_key: reference.storageKey,
    local_file_name: reference.fileName,
    local_content_type: reference.contentType,
    local_size: reference.size,
  }
  return storedItem
}

export function localMediaReference(item: ILinkMessageItem): LocalMediaReference | null {
  const itemData = mediaItemData(item)
  const media = itemData?.media
  if (!media || typeof media !== 'object') return null
  const value = media as Record<string, unknown>
  if (typeof value.local_storage_key !== 'string' || !value.local_storage_key.trim()) return null
  return {
    storageKey: value.local_storage_key,
    fileName: typeof value.local_file_name === 'string' ? value.local_file_name : 'media-file',
    contentType:
      typeof value.local_content_type === 'string'
        ? value.local_content_type
        : 'application/octet-stream',
    size: typeof value.local_size === 'number' ? value.local_size : 0,
  }
}

export function localMediaRoot() {
  const configured = env.get('MEDIA_STORAGE_PATH')
  return configured && path.isAbsolute(configured)
    ? path.normalize(configured)
    : configured
      ? app.makePath(configured)
      : DEFAULT_MEDIA_ROOT
}

function resolveStoragePath(storageKey: string) {
  const root = localMediaRoot()
  const resolved = path.resolve(root, storageKey)
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('invalid local media storage key')
  }
  return resolved
}

function normalizeStorageKey(value: string) {
  const normalized = value.trim().replaceAll('\\', '/')
  if (!normalized || normalized.startsWith('/') || normalized.includes('../')) {
    throw new Error('invalid local media storage key')
  }
  return normalized
}

function mediaItemData(item: ILinkMessageItem) {
  const type = String(item.type ?? '')
  if (type === '2' || type === 'image' || type === 'picture')
    return asMediaItemData(item.image_item)
  if (type === '3' || type === 'voice' || type === 'audio') return asMediaItemData(item.voice_item)
  if (type === '4' || type === 'file' || type === 'document') return asMediaItemData(item.file_item)
  if (type === '5' || type === 'video') return asMediaItemData(item.video_item)
  return asMediaItemData(item.image_item || item.voice_item || item.file_item || item.video_item)
}

function asMediaItemData(value: Record<string, unknown> | undefined) {
  return value as (Record<string, unknown> & { media?: Record<string, unknown> }) | undefined
}

function safePathPart(value: string) {
  const normalized = value.replace(/[^a-zA-Z0-9._-]/g, '_')
  if (!normalized || normalized === '.' || normalized === '..') {
    throw new Error('invalid local media path part')
  }
  return normalized
}

function safeFileName(value: string) {
  const baseName = path.basename(value).trim()
  const normalized = baseName.replace(/[^a-zA-Z0-9._-\u4e00-\u9fff]/g, '_')
  return normalized || 'media-file'
}
