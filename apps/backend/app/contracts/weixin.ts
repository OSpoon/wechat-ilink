export const weixinLoginSessionStatuses = [
  'waiting_scan',
  'scanned',
  'need_verifycode',
  'verifying',
  'confirmed',
  'already_connected',
  'failed',
  'expired',
  'cancelled',
] as const
export type WeixinLoginSessionStatus = (typeof weixinLoginSessionStatuses)[number]

export const weixinAccountStatuses = [
  'stopped',
  'starting',
  'running',
  'reauth_required',
  'error',
] as const
export type WeixinAccountStatus = (typeof weixinAccountStatuses)[number]

export const weixinMessageDirections = ['inbound', 'outbound'] as const
export type WeixinMessageDirection = (typeof weixinMessageDirections)[number]

export const weixinMessageStatuses = ['received', 'sent', 'failed'] as const
export type WeixinMessageStatus = (typeof weixinMessageStatuses)[number]

export const weixinWebhookDeliveryStatuses = ['pending', 'delivered', 'failed'] as const
export type WeixinWebhookDeliveryStatus = (typeof weixinWebhookDeliveryStatuses)[number]

export const weixinWebhookEvents = ['message.received'] as const
export type WeixinWebhookEvent = (typeof weixinWebhookEvents)[number]

export const weixinTypingStatuses = [1, 2] as const
export type WeixinTypingStatus = (typeof weixinTypingStatuses)[number]

export const ILinkMessageType = {
  NONE: 0,
  USER: 1,
  BOT: 2,
} as const

export const ILinkMessageState = {
  NEW: 0,
  GENERATING: 1,
  FINISH: 2,
} as const

export type ILinkMessageTypeValue = (typeof ILinkMessageType)[keyof typeof ILinkMessageType]
export type ILinkMessageStateValue = (typeof ILinkMessageState)[keyof typeof ILinkMessageState]

export const ILinkMessageItemType = {
  NONE: 0,
  TEXT: 1,
  IMAGE: 2,
  VOICE: 3,
  FILE: 4,
  VIDEO: 5,
  TOOL_CALL_START: 11,
  TOOL_CALL_RESULT: 12,
} as const

export type ILinkTextItem = {
  text?: string
}

export type ILinkMessageItem = {
  type?: number
  create_time_ms?: number
  update_time_ms?: number
  is_completed?: boolean
  msg_id?: string
  ref_msg?: {
    title?: string
    message_item?: ILinkMessageItem
  }
  text_item?: ILinkTextItem
  image_item?: Record<string, unknown>
  voice_item?: Record<string, unknown>
  file_item?: Record<string, unknown>
  video_item?: Record<string, unknown>
  tool_call_start_item?: {
    tool_name?: string
    tool_call_id?: string
  }
  tool_call_result_item?: {
    tool_name?: string
    tool_call_id?: string
    status?: string
  }
}

export type ILinkSendMessage = {
  from_user_id: string
  to_user_id: string
  client_id: string
  message_type: ILinkMessageTypeValue
  message_state: ILinkMessageStateValue
  item_list?: ILinkMessageItem[]
  context_token?: string
  run_id?: string
}

export type ILinkUploadUrlResponse = {
  ret?: number
  errcode?: number
  errmsg?: string
  upload_param?: string
  thumb_upload_param?: string
  upload_full_url?: string
}

export type ILinkConfigResponse = {
  ret?: number
  errcode?: number
  errmsg?: string
  typing_ticket?: string
}

export type ILinkMessage = {
  seq?: number
  message_id?: number
  from_user_id?: string
  to_user_id?: string
  client_id?: string
  create_time_ms?: number
  update_time_ms?: number
  delete_time_ms?: number
  session_id?: string
  group_id?: string
  message_type?: number
  message_state?: number
  item_list?: ILinkMessageItem[]
  context_token?: string
  run_id?: string
}

export type ILinkUpdatesResponse = {
  ret?: number
  errcode?: number
  errmsg?: string
  msgs?: ILinkMessage[]
  get_updates_buf?: string
  longpolling_timeout_ms?: number
}

export type ILinkQrCodeResponse = {
  qrcode: string
  qrcode_img_content: string
}

export const iLinkQrStatuses = [
  'wait',
  'scaned',
  'scanned',
  'confirmed',
  'expired',
  'scaned_but_redirect',
  'need_verifycode',
  'verify_code_blocked',
  'binded_redirect',
] as const
export type ILinkQrStatus = (typeof iLinkQrStatuses)[number]

export type ILinkQrStatusResponse = {
  status: ILinkQrStatus
  bot_token?: string
  ilink_bot_id?: string
  baseurl?: string
  ilink_user_id?: string
  redirect_host?: string
}
