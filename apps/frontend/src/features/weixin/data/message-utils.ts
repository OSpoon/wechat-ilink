import i18n from '@/i18n'
import type { WeixinMessage } from '@/lib/api-types'

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function messageText(message: WeixinMessage) {
  const payload = message.payload
  if (typeof payload.text === 'string' && payload.text.trim())
    return payload.text

  const textItem = asRecord(payload.text_item)
  if (typeof textItem?.text === 'string' && textItem.text.trim())
    return textItem.text

  const itemList = Array.isArray(payload.item_list) ? payload.item_list : []
  return itemList
    .map((value) => {
      const item = asRecord(value)
      const text = asRecord(item?.text_item)?.text
      return typeof text === 'string' ? text : ''
    })
    .filter(Boolean)
    .join('\n')
}

export function messagePeer(message: WeixinMessage) {
  return message.direction === 'inbound' ? message.from : message.to
}

export function messageKind(message: WeixinMessage) {
  const type = String(message.payload.type ?? '').toLowerCase()
  if (type === '1' || type === 'text') return 'text'
  if (type === '2' || type === 'image' || type === 'picture') return 'image'
  if (type === '3' || type === 'voice' || type === 'audio') return 'audio'
  if (type === '4' || type === 'file' || type === 'document') return 'file'
  if (type === '5' || type === 'video') return 'video'

  const items = Array.isArray(message.payload.item_list)
    ? message.payload.item_list
    : []
  const first = asRecord(items[0])
  const itemType = String(first?.type ?? '').toLowerCase()
  if (itemType === '2' || first?.image_item) return 'image'
  if (itemType === '3' || first?.voice_item) return 'audio'
  if (itemType === '4' || first?.file_item) return 'file'
  if (itemType === '5' || first?.video_item) return 'video'
  return 'text'
}

export function messagePreview(message: WeixinMessage) {
  const text = messageText(message)
  if (text) return text
  const kind = messageKind(message)
  return i18n.t(
    {
      text: 'Message',
      image: 'Image',
      video: 'Video',
      audio: 'Voice message',
      file: 'File',
    }[kind] ?? 'Message'
  )
}

function currentLocale() {
  return i18n.resolvedLanguage?.toLowerCase().startsWith('zh')
    ? 'zh-CN'
    : 'en-US'
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString(currentLocale(), { hour12: false })
}

export function formatTime(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString(currentLocale(), {
        hour: '2-digit',
        minute: '2-digit',
      })
}
