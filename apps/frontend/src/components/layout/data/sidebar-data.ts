import {
  LayoutDashboard,
  MessagesSquare,
  Radio,
  Smartphone,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'WeChat Admin',
    email: '',
    avatar: '',
  },
  navGroups: [
    {
      title: 'WeChat',
      items: [
        { title: 'Dashboard', url: '/', icon: LayoutDashboard },
        { title: 'Chats', url: '/chats', icon: MessagesSquare },
        { title: 'Accounts', url: '/accounts', icon: Smartphone },
        { title: 'Webhooks', url: '/webhooks', icon: Radio },
      ],
    },
  ],
}
