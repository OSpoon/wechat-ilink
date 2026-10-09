import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type Sale = {
  name: string
  email: string
  avatar: string
  initials: string
  amount: number
}

export function RecentSales({ data }: { data: Sale[] }) {
  return (
    <div className='space-y-8'>
      {data.map((sale) => (
        <div className='flex items-center gap-4' key={sale.email}>
          <Avatar className='h-9 w-9'>
            <AvatarImage src={sale.avatar} alt={sale.name} />
            <AvatarFallback>{sale.initials}</AvatarFallback>
          </Avatar>
          <div className='flex flex-1 flex-wrap items-center justify-between'>
            <div className='space-y-1'>
              <p className='text-sm leading-none font-medium'>{sale.name}</p>
              <p className='text-sm text-muted-foreground'>{sale.email}</p>
            </div>
            <div className='font-medium'>
              +$
              {sale.amount.toLocaleString('en-US', {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
