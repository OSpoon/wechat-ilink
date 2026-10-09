import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { format } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'
import { enUS, zhCN } from 'date-fns/locale'
import {
  ArrowLeft,
  Copy,
  Download,
  Edit,
  Keyboard,
  MessagesSquare,
  CircleX,
  MessageCircle,
  Paperclip,
  Plus,
  RefreshCw,
  Search as SearchIcon,
  Send,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { weixinApi } from '@/lib/api'
import type { WeixinMessage } from '@/lib/api-types'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { errorMessage } from '@/features/weixin/data/error-message'
import {
  formatTime,
  messageKind,
  messagePeer,
  messagePreview,
} from '@/features/weixin/data/message-utils'

type ConversationSummary = {
  peerId: string
  latest: WeixinMessage
}

type MediaType = 'image' | 'video' | 'file'

const EMPTY_MESSAGES: WeixinMessage[] = []

export function ChatsRoute() {
  const { accountId } = useSearch({ from: '/_authenticated/chats/' })
  return <Chats initialAccountId={accountId} />
}

export function Chats({
  initialAccountId = '',
}: {
  initialAccountId?: string
}) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedAccountId, setSelectedAccountId] = useState(initialAccountId)
  const [selectedPeer, setSelectedPeer] = useState('')
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [draft, setDraft] = useState('')
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [newPeerId, setNewPeerId] = useState('')
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false)
  const [mediaType, setMediaType] = useState<MediaType>('image')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const accountsQuery = useQuery({
    queryKey: ['weixin', 'accounts'],
    queryFn: weixinApi.accounts.list,
  })

  const accountId = selectedAccountId || accountsQuery.data?.[0]?.id || ''

  const messagesQuery = useQuery({
    queryKey: ['weixin', 'messages', accountId],
    queryFn: () => weixinApi.messages.list(accountId, 100),
    enabled: Boolean(accountId),
    refetchInterval: 5000,
  })
  const messages = useMemo(
    () => messagesQuery.data ?? EMPTY_MESSAGES,
    [messagesQuery.data]
  )
  const conversations = useMemo(() => {
    const grouped = new Map<string, ConversationSummary>()
    for (const message of messages) {
      const peerId = messagePeer(message)
      if (!peerId) continue
      const existing = grouped.get(peerId)
      if (existing) {
        if (
          Date.parse(message.createdAt) > Date.parse(existing.latest.createdAt)
        ) {
          existing.latest = message
        }
      } else {
        grouped.set(peerId, { peerId, latest: message })
      }
    }
    return [...grouped.values()].sort(
      (left, right) =>
        Date.parse(right.latest.createdAt) - Date.parse(left.latest.createdAt)
    )
  }, [messages])
  const filteredConversations = conversations.filter((conversation) =>
    conversation.peerId.toLowerCase().includes(filter.trim().toLowerCase())
  )

  const activePeer = selectedPeer || conversations[0]?.peerId || ''

  const selectedAccount = accountsQuery.data?.find(
    (account) => account.id === accountId
  )
  const thread = [...messages]
    .filter((message) => messagePeer(message) === activePeer)
    .sort(
      (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt)
    )
  const dateLocale = i18n.language.startsWith('zh') ? zhCN : enUS
  const threadGroups = thread.reduce<
    { date: string; messages: WeixinMessage[] }[]
  >((groups, message) => {
    const date = format(
      new Date(message.createdAt),
      i18n.language.startsWith('zh') ? 'yyyy年M月d日' : 'd MMM, yyyy',
      { locale: dateLocale }
    )
    const lastGroup = groups[groups.length - 1]
    if (lastGroup?.date === date) lastGroup.messages.push(message)
    else groups.push({ date, messages: [message] })
    return groups
  }, [])
  const sendMessage = useMutation({
    mutationFn: () =>
      weixinApi.messages.sendText(accountId, activePeer, draft.trim()),
    onSuccess: async () => {
      setDraft('')
      await queryClient.invalidateQueries({
        queryKey: ['weixin', 'messages', accountId],
      })
      toast.success(t('Message sent.'))
    },
    onError: (error) =>
      toast.error(errorMessage(error, t('Failed to send message.'))),
  })
  const sendMedia = useMutation({
    mutationFn: () => {
      if (!mediaFile) throw new Error(t('Select a file to send.'))
      if (!activePeer) throw new Error(t('Choose a conversation'))
      return weixinApi.messages.sendMedia(accountId, {
        to: activePeer,
        mediaType,
        caption: caption.trim() || undefined,
        file: mediaFile,
      })
    },
    onSuccess: async () => {
      setCaption('')
      setMediaFile(null)
      setMediaDialogOpen(false)
      await queryClient.invalidateQueries({
        queryKey: ['weixin', 'messages', accountId],
      })
      toast.success(t('Media message sent.'))
    },
    onError: (error) =>
      toast.error(errorMessage(error, t('Failed to send media.'))),
  })
  const typing = useMutation({
    mutationFn: (status: 1 | 2) =>
      weixinApi.messages.typing(accountId, activePeer, status),
    onSuccess: (_result, status) =>
      toast.success(
        status === 1 ? t('Typing status sent.') : t('Typing status cleared.')
      ),
    onError: (error) =>
      toast.error(errorMessage(error, t('Failed to send typing status.'))),
  })

  const accountPicker = (
    <Select
      value={accountId}
      onValueChange={(value) => {
        setSelectedAccountId(value)
        setSelectedPeer('')
        setMobileChatOpen(false)
      }}
    >
      <SelectTrigger
        className='h-9 w-full min-w-0 bg-background text-sm'
        aria-label={t('Select WeChat account')}
      >
        <SelectValue
          className='min-w-0 flex-1 truncate'
          placeholder={t('Select WeChat account')}
        />
      </SelectTrigger>
      <SelectContent>
        {(accountsQuery.data ?? []).map((account) => (
          <SelectItem key={account.id} value={account.id}>
            <span
              className='block max-w-[60vw] truncate sm:max-w-sm'
              title={account.ilinkUserId || account.providerAccountId}
            >
              {account.ilinkUserId || account.providerAccountId}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      !activePeer ||
      !draft.trim() ||
      selectedAccount?.status === 'reauth_required'
    )
      return
    sendMessage.mutate()
  }

  function submitMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      !activePeer ||
      !mediaFile ||
      selectedAccount?.status === 'reauth_required'
    )
      return
    sendMedia.mutate()
  }

  async function downloadMedia(messageId: string, itemIndex: number) {
    try {
      const blob = await weixinApi.messages.downloadMedia(
        accountId,
        messageId,
        itemIndex
      )
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${messageId}-${itemIndex}`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(errorMessage(error, t('Failed to download media.')))
    }
  }

  function beginConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const peerId = newPeerId.trim()
    if (!peerId) return
    setSelectedPeer(peerId)
    setMobileChatOpen(true)
    setNewPeerId('')
    setNewChatOpen(false)
  }

  async function copyActivePeerId() {
    try {
      await navigator.clipboard.writeText(activePeer)
      toast.success(t('WeChat user ID copied.'))
    } catch {
      toast.error(t('Failed to copy WeChat user ID.'))
    }
  }

  return (
    <>
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main fixed>
        <section className='relative flex h-full min-h-0 gap-6'>
          <aside className='flex min-h-0 w-full flex-col gap-2 sm:w-56 lg:w-72 2xl:w-80'>
            <div className='sticky top-0 z-10 -mx-4 bg-background px-4 pb-3 shadow-md sm:static sm:z-auto sm:mx-0 sm:p-0 sm:shadow-none'>
              <div className='flex items-center justify-between py-2'>
                <div className='flex items-center gap-2'>
                  <h1 className='text-2xl font-bold'>{t('Chats')}</h1>
                  <MessagesSquare size={20} />
                </div>
                <Button
                  size='icon'
                  variant='ghost'
                  className='rounded-lg'
                  aria-label={t('New conversation')}
                  onClick={() => setNewChatOpen(true)}
                  disabled={!accountId}
                >
                  <Edit size={24} className='stroke-muted-foreground' />
                </Button>
              </div>

              <label
                className={cn(
                  'focus-within:ring-1 focus-within:ring-ring focus-within:outline-hidden',
                  'flex h-10 w-full items-center rounded-md border border-border ps-2'
                )}
              >
                <SearchIcon
                  size={15}
                  className='me-2 shrink-0 text-slate-500'
                />
                <span className='sr-only'>{t('Search conversations')}</span>
                <input
                  type='text'
                  className='w-full min-w-0 flex-1 bg-inherit text-sm focus-visible:outline-hidden'
                  placeholder={t('Search chat...')}
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                />
              </label>

              {accountsQuery.data && accountsQuery.data.length > 1 && (
                <div className='mt-2 min-w-0'>{accountPicker}</div>
              )}
              {accountsQuery.isError && (
                <p className='mt-2 text-sm text-destructive'>
                  {errorMessage(
                    accountsQuery.error,
                    t('Failed to load WeChat accounts.')
                  )}
                </p>
              )}
            </div>

            <ScrollArea className='min-h-0 flex-1 overflow-hidden ps-0 pe-3'>
              {accountsQuery.isPending || messagesQuery.isPending ? (
                <p className='p-5 text-center text-sm text-muted-foreground'>
                  {t('Loading conversations…')}
                </p>
              ) : messagesQuery.isError ? (
                <p className='p-4 text-sm text-destructive'>
                  {errorMessage(
                    messagesQuery.error,
                    t('Failed to load conversations.')
                  )}
                </p>
              ) : !accountsQuery.data?.length ? (
                <p className='px-3 py-8 text-center text-sm text-muted-foreground'>
                  {t('Connect a WeChat account first')}
                </p>
              ) : filteredConversations.length ? (
                filteredConversations.map((conversation) => (
                  <Fragment key={conversation.peerId}>
                    <button
                      type='button'
                      className={cn(
                        'group flex w-full min-w-0 overflow-hidden rounded-lg py-2 ps-3 pe-5 text-start text-sm hover:bg-accent hover:text-accent-foreground',
                        activePeer === conversation.peerId && 'sm:bg-muted'
                      )}
                      onClick={() => {
                        setSelectedPeer(conversation.peerId)
                        setMobileChatOpen(true)
                      }}
                    >
                      <div className='flex w-0 min-w-0 flex-1 gap-2'>
                        <Avatar className='shrink-0'>
                          <AvatarFallback>
                            {conversation.peerId.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className='w-0 min-w-0 flex-1 overflow-hidden'>
                          <span
                            className='block max-w-full truncate font-medium'
                            title={conversation.peerId}
                          >
                            {conversation.peerId}
                          </span>
                          <span className='line-clamp-2 break-all text-muted-foreground group-hover:text-accent-foreground/90'>
                            {conversation.latest.direction === 'outbound'
                              ? `${t('Me:')} `
                              : ''}
                            {messagePreview(conversation.latest)}
                          </span>
                        </div>
                      </div>
                    </button>
                    <Separator className='my-1' />
                  </Fragment>
                ))
              ) : (
                <div className='px-5 py-12 text-center text-sm text-muted-foreground'>
                  {filter
                    ? t('No matching conversations.')
                    : t(
                        'Conversations will appear here after the first message.'
                      )}
                </div>
              )}
            </ScrollArea>
          </aside>

          {activePeer ? (
            <section
              className={cn(
                'absolute inset-0 start-full z-50 hidden w-full flex-1 flex-col rounded-md border bg-background shadow-xs sm:static sm:z-auto sm:flex',
                mobileChatOpen && 'inset-s-0 flex'
              )}
            >
              <div className='mb-1 flex flex-none justify-between bg-card p-4 shadow-lg sm:rounded-t-md'>
                <div className='flex min-w-0 items-center gap-2 lg:gap-4'>
                  <Button
                    size='icon'
                    variant='ghost'
                    className='-ms-2 h-full shrink-0 sm:hidden'
                    aria-label={t('Back to conversations')}
                    onClick={() => setMobileChatOpen(false)}
                  >
                    <ArrowLeft className='rtl:rotate-180' />
                  </Button>
                  <Avatar className='size-9 shrink-0 lg:size-11'>
                    <AvatarFallback>
                      {activePeer.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className='min-w-0'>
                    <span
                      className='block truncate text-sm font-medium lg:text-base'
                      title={activePeer}
                    >
                      {activePeer}
                    </span>
                    <span className='block truncate text-xs text-muted-foreground lg:text-sm'>
                      {t('WeChat user ID')}
                    </span>
                  </div>
                </div>
                <div className='-me-1 flex shrink-0 items-center gap-1 lg:gap-2'>
                  <Button
                    size='icon'
                    variant='ghost'
                    className='size-8 rounded-full lg:size-10'
                    aria-label={t('Copy user ID')}
                    title={t('Copy user ID')}
                    onClick={() => void copyActivePeerId()}
                  >
                    <Copy className='stroke-muted-foreground' />
                  </Button>
                  <Button
                    size='icon'
                    variant='ghost'
                    className='size-8 rounded-full lg:size-10'
                    aria-label={t('Refresh messages')}
                    disabled={messagesQuery.isFetching}
                    onClick={() => void messagesQuery.refetch()}
                  >
                    <RefreshCw
                      className={cn(
                        'stroke-muted-foreground',
                        messagesQuery.isFetching && 'animate-spin'
                      )}
                    />
                  </Button>
                </div>
              </div>

              <div className='flex min-h-0 flex-1 flex-col gap-2 rounded-md px-4 pt-0 pb-4'>
                <div className='flex min-h-0 flex-1'>
                  <div className='chat-text-container relative -me-4 flex min-h-0 flex-1 flex-col overflow-hidden'>
                    {thread.length ? (
                      <ScrollArea className='h-full min-h-0 flex-1'>
                        <div className='flex min-h-full flex-col justify-end gap-4 py-2 pe-4 pb-4'>
                          {threadGroups.map((group) => (
                            <Fragment key={group.date}>
                              {group.messages.map((message) => (
                                <div
                                  key={message.id}
                                  className={cn(
                                    'flex',
                                    message.direction === 'outbound'
                                      ? 'justify-end'
                                      : 'justify-start'
                                  )}
                                >
                                  <div
                                    className={cn(
                                      'chat-box max-w-[85%] px-3 py-2 wrap-break-word shadow-lg sm:max-w-72',
                                      message.direction === 'outbound'
                                        ? 'rounded-[16px_16px_0_16px] bg-primary/90 text-primary-foreground/75'
                                        : 'rounded-[16px_16px_16px_0] bg-muted'
                                    )}
                                  >
                                    <p className='break-words whitespace-pre-wrap'>
                                      {messagePreview(message)}
                                    </p>
                                    {message.media.length > 0 && (
                                      <div className='mt-2 flex flex-wrap gap-1'>
                                        {message.media.map((item) => (
                                          <Fragment key={item.itemIndex}>
                                            {messageKind(message) ===
                                              'image' && (
                                              <ChatMediaPreview
                                                accountId={accountId}
                                                messageId={message.id}
                                                itemIndex={item.itemIndex}
                                                kind='image'
                                                alt={messagePreview(message)}
                                              />
                                            )}
                                            {messageKind(message) ===
                                              'video' && (
                                              <ChatMediaPreview
                                                accountId={accountId}
                                                messageId={message.id}
                                                itemIndex={item.itemIndex}
                                                kind='video'
                                                alt={messagePreview(message)}
                                              />
                                            )}
                                            {!['image', 'video'].includes(
                                              messageKind(message)
                                            ) && (
                                              <Button
                                                size='sm'
                                                variant='outline'
                                                className='h-7 border-border bg-background px-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground'
                                                onClick={() =>
                                                  void downloadMedia(
                                                    message.id,
                                                    item.itemIndex
                                                  )
                                                }
                                              >
                                                <Download />{' '}
                                                {t('Download media {{index}}', {
                                                  index: item.itemIndex + 1,
                                                })}
                                              </Button>
                                            )}
                                          </Fragment>
                                        ))}
                                      </div>
                                    )}
                                    <span
                                      className={cn(
                                        'mt-1 block text-xs font-light text-foreground/75 italic',
                                        message.direction === 'outbound' &&
                                          'text-end text-primary-foreground/85'
                                      )}
                                    >
                                      {formatTime(
                                        message.receivedAt ||
                                          message.sentAt ||
                                          message.createdAt
                                      )}
                                      {message.direction === 'outbound' &&
                                        message.status === 'failed' &&
                                        ` · ${t('Failed to send')}`}
                                      {message.direction === 'outbound' &&
                                        message.status === 'sent' &&
                                        ` · ${t('Sent')}`}
                                    </span>
                                  </div>
                                </div>
                              ))}
                              <div className='text-center text-xs text-muted-foreground'>
                                {group.date}
                              </div>
                            </Fragment>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className='flex h-full min-h-48 items-center justify-center text-sm text-muted-foreground'>
                        {t(
                          'This conversation has no messages yet. Send a message to start chatting.'
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <form
                  className='flex w-full flex-none flex-col gap-2'
                  onSubmit={submitMessage}
                >
                  {selectedAccount?.status === 'reauth_required' && (
                    <p className='text-xs text-destructive'>
                      {t(
                        'This account needs to be reconnected by scanning the QR code before you can send messages.'
                      )}
                    </p>
                  )}
                  <div className='flex flex-1 items-center gap-2 rounded-md border border-input bg-card px-2 py-1 focus-within:ring-1 focus-within:ring-ring focus-within:outline-hidden lg:gap-4'>
                    <div className='flex shrink-0 items-center gap-1'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size='icon'
                            type='button'
                            variant='ghost'
                            className='h-8 rounded-md'
                            aria-label={t('More chat actions')}
                            disabled={
                              !accountId ||
                              !activePeer ||
                              selectedAccount?.status === 'reauth_required'
                            }
                          >
                            <Plus
                              size={20}
                              className='stroke-muted-foreground'
                            />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='start'>
                          <DropdownMenuItem
                            onSelect={() => setMediaDialogOpen(true)}
                          >
                            <Paperclip /> {t('Send media')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={typing.isPending}
                            onSelect={() => typing.mutate(1)}
                          >
                            <Keyboard />
                            {t('Currently typing')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={typing.isPending}
                            onSelect={() => typing.mutate(2)}
                          >
                            <CircleX />
                            {t('Clear typing status')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <label className='min-w-0 flex-1'>
                      <span className='sr-only'>{t('Chat message')}</span>
                      <Textarea
                        aria-label={t('Chat message')}
                        className='h-8 max-h-36 min-h-8 w-full resize-none border-0 bg-inherit px-1 py-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0'
                        maxLength={4000}
                        placeholder={t('Type a message...')}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault()
                            event.currentTarget.form?.requestSubmit()
                          }
                        }}
                      />
                    </label>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='hidden sm:inline-flex'
                      type='submit'
                      aria-label={t('Send message')}
                      disabled={
                        !draft.trim() ||
                        sendMessage.isPending ||
                        selectedAccount?.status === 'reauth_required'
                      }
                    >
                      <Send size={20} />
                    </Button>
                  </div>
                  <Button
                    className='h-full sm:hidden'
                    type='submit'
                    disabled={
                      !draft.trim() ||
                      sendMessage.isPending ||
                      selectedAccount?.status === 'reauth_required'
                    }
                  >
                    <Send size={18} /> {t('Send message')}
                  </Button>
                </form>
              </div>
            </section>
          ) : (
            <div className='absolute inset-0 start-full z-50 hidden w-full flex-1 flex-col justify-center rounded-md border bg-card shadow-xs sm:static sm:z-auto sm:flex'>
              <div className='flex flex-col items-center space-y-6 px-6 text-center'>
                <div className='flex size-16 items-center justify-center rounded-full border-2 border-border'>
                  {accountsQuery.data?.length ? (
                    <MessagesSquare className='size-8' />
                  ) : (
                    <MessageCircle className='size-8' />
                  )}
                </div>
                <div className='space-y-2'>
                  <h2 className='text-xl font-semibold'>
                    {accountsQuery.data?.length
                      ? t('Choose a conversation')
                      : t('Connect a WeChat account first')}
                  </h2>
                  <p className='max-w-md text-sm text-muted-foreground'>
                    {accountsQuery.data?.length
                      ? t(
                          "Select a conversation on the left, or start a new one with the recipient's WeChat user ID. You can find it in the from field of an inbound message or in a message.received Webhook delivery payload."
                        )
                      : t(
                          'Conversations are created automatically from incoming and outgoing messages.'
                        )}
                  </p>
                </div>
                {accountsQuery.data?.length ? (
                  <Button onClick={() => setNewChatOpen(true)}>
                    {t('New conversation')}
                  </Button>
                ) : (
                  <Button asChild>
                    <Link to='/accounts'>{t('Manage WeChat accounts')}</Link>
                  </Button>
                )}
                {messagesQuery.isError && (
                  <p className='text-sm text-destructive'>
                    {errorMessage(
                      messagesQuery.error,
                      t('Read messages failed.')
                    )}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      </Main>

      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('New WeChat conversation')}</DialogTitle>
            <DialogDescription>
              {t(
                "Enter the recipient's WeChat iLink user ID. For an existing chat, copy the ID from its chat header. Otherwise, use the from field of an inbound message or the payload of a message.received Webhook delivery."
              )}
            </DialogDescription>
          </DialogHeader>
          <form
            id='new-weixin-chat'
            className='space-y-3'
            onSubmit={beginConversation}
          >
            <Input
              autoFocus
              aria-label={t('WeChat user ID')}
              placeholder='user_xxx'
              value={newPeerId}
              onChange={(event) => setNewPeerId(event.target.value)}
            />
          </form>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setNewChatOpen(false)}
            >
              {t('Cancel')}
            </Button>
            <Button
              type='submit'
              form='new-weixin-chat'
              disabled={!newPeerId.trim()}
            >
              {t('Open conversation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={mediaDialogOpen}
        onOpenChange={(open) => {
          setMediaDialogOpen(open)
          if (!open) {
            setMediaFile(null)
            setCaption('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Send media')}</DialogTitle>
            <DialogDescription>
              {t('Supports images, videos, and files up to 20 MB each.')}
            </DialogDescription>
          </DialogHeader>
          <form
            id='send-chat-media'
            className='space-y-3'
            onSubmit={submitMedia}
          >
            <Select
              value={mediaType}
              onValueChange={(value) => setMediaType(value as MediaType)}
            >
              <SelectTrigger className='w-full' aria-label={t('Media type')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='image'>{t('Image')}</SelectItem>
                <SelectItem value='video'>{t('Video')}</SelectItem>
                <SelectItem value='file'>{t('File')}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              aria-label={t('Choose a media file')}
              type='file'
              accept={
                mediaType === 'image'
                  ? 'image/*'
                  : mediaType === 'video'
                    ? 'video/*'
                    : undefined
              }
              onChange={(event) =>
                setMediaFile(event.target.files?.[0] ?? null)
              }
            />
            <Input
              aria-label={t('Media caption')}
              maxLength={4000}
              placeholder={t('Caption (optional)')}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
            />
          </form>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setMediaDialogOpen(false)}
            >
              {t('Cancel')}
            </Button>
            <Button
              type='submit'
              form='send-chat-media'
              disabled={
                !mediaFile ||
                sendMedia.isPending ||
                selectedAccount?.status === 'reauth_required'
              }
            >
              <Paperclip />{' '}
              {sendMedia.isPending ? t('Sending…') : t('Send media')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ChatMediaPreview({
  accountId,
  messageId,
  itemIndex,
  kind,
  alt,
}: {
  accountId: string
  messageId: string
  itemIndex: number
  kind: 'image' | 'video'
  alt: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !('IntersectionObserver' in window)) {
      setShouldLoad(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: '160px' }
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!shouldLoad) return
    let active = true
    let objectUrl = ''

    void weixinApi.messages
      .downloadMedia(accountId, messageId, itemIndex)
      .then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setPreviewUrl(objectUrl)
      })
      .catch(() => {
        if (active) setFailed(true)
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [accountId, itemIndex, messageId, shouldLoad])

  if (failed) return null

  return (
    <div ref={containerRef} className='w-full max-w-full'>
      {previewUrl ? (
        kind === 'image' ? (
          <img
            src={previewUrl}
            alt={alt}
            className='mt-1 max-h-72 max-w-full rounded-md object-contain'
          />
        ) : (
          <video
            src={previewUrl}
            controls
            preload='metadata'
            aria-label={alt}
            className='mt-1 max-h-72 max-w-full rounded-md'
          />
        )
      ) : (
        <div className='mt-1 h-36 w-52 max-w-full animate-pulse rounded-md bg-foreground/10' />
      )}
    </div>
  )
}
