import type { HttpContext } from '@adonisjs/core/http'

export default class DashboardController {
  async show(_context: HttpContext) {
    return {
      data: {
        overview: {
          revenue: '$45,231.89',
          revenueChange: '+20.1% from last month',
          subscriptions: '+2350',
          subscriptionsChange: '+180.1% from last month',
          sales: '+12,234',
          salesChange: '+19% from last month',
          activeNow: '+573',
          activeNowChange: '+201 since last hour',
          salesThisMonth: 265,
          monthlyRevenue: [
            ['Jan', 3200],
            ['Feb', 4100],
            ['Mar', 3650],
            ['Apr', 4900],
            ['May', 4300],
            ['Jun', 5100],
            ['Jul', 4700],
            ['Aug', 5600],
            ['Sep', 5150],
            ['Oct', 5900],
            ['Nov', 5400],
            ['Dec', 6200],
          ].map(([name, total]) => ({ name, total })),
          recentSales: [
            {
              name: 'Olivia Martin',
              email: 'olivia.martin@email.com',
              avatar: '/avatars/01.png',
              initials: 'OM',
              amount: 1999,
            },
            {
              name: 'Jackson Lee',
              email: 'jackson.lee@email.com',
              avatar: '/avatars/02.png',
              initials: 'JL',
              amount: 39,
            },
            {
              name: 'Isabella Nguyen',
              email: 'isabella.nguyen@email.com',
              avatar: '/avatars/03.png',
              initials: 'IN',
              amount: 299,
            },
            {
              name: 'William Kim',
              email: 'will@email.com',
              avatar: '/avatars/04.png',
              initials: 'WK',
              amount: 99,
            },
            {
              name: 'Sofia Davis',
              email: 'sofia.davis@email.com',
              avatar: '/avatars/05.png',
              initials: 'SD',
              amount: 39,
            },
          ],
        },
        analytics: {
          traffic: [
            { name: 'Mon', clicks: 420, uniques: 310 },
            { name: 'Tue', clicks: 680, uniques: 490 },
            { name: 'Wed', clicks: 570, uniques: 430 },
            { name: 'Thu', clicks: 830, uniques: 610 },
            { name: 'Fri', clicks: 740, uniques: 550 },
            { name: 'Sat', clicks: 390, uniques: 280 },
            { name: 'Sun', clicks: 510, uniques: 360 },
          ],
          stats: [
            { label: 'Total Clicks', value: '1,248', change: '+12.4% vs last week' },
            { label: 'Unique Visitors', value: '832', change: '+5.8% vs last week' },
            { label: 'Bounce Rate', value: '42%', change: '-3.2% vs last week' },
            { label: 'Avg. Session', value: '3m 24s', change: '+18s vs last week' },
          ],
          referrers: [
            { name: 'Direct', value: 512 },
            { name: 'Product Hunt', value: 238 },
            { name: 'Twitter', value: 174 },
            { name: 'Blog', value: 104 },
          ],
          devices: [
            { name: 'Desktop', value: 74 },
            { name: 'Mobile', value: 22 },
            { name: 'Tablet', value: 4 },
          ],
        },
      },
    }
  }
}
