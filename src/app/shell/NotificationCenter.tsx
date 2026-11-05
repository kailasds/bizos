import { BellOff, X } from 'lucide-react'
import { useOs } from '@/app/os/use-os'
import { MockBadge } from '@/components/os/MockBadge'
import { StatusBadge, type StatusTone } from '@/components/os/StatusBadge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { PopoverContent } from '@/components/ui/popover'
import type { NotificationTone, OsNotification } from '@/data/notifications.mock'
import { cn } from '@/lib/utils'

const toneLabel: Record<NotificationTone, string> = {
  info: 'Info',
  warning: 'Action needed',
  danger: 'Failed',
  success: 'Done',
}

function NotificationItem({ notification }: { notification: OsNotification }) {
  const { markNotificationRead, dismissNotification, openApp, setNotificationsOpen } = useOs()
  const { target } = notification

  return (
    <li className={cn('group relative flex gap-3 px-4 py-3', !notification.read && 'bg-accent/50')}>
      <span
        aria-hidden
        className={cn('mt-1.5 size-2 shrink-0 rounded-full', notification.read ? 'bg-transparent' : 'bg-primary')}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{notification.source}</span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">{notification.at}</span>
        </div>
        <p className="mt-0.5 text-sm font-medium">{notification.title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{notification.body}</p>
        <div className="mt-2 flex items-center gap-2">
          <StatusBadge tone={notification.tone as StatusTone}>{toneLabel[notification.tone]}</StatusBadge>
          {target && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                markNotificationRead(notification.id)
                openApp(target.appId, target.params)
                setNotificationsOpen(false)
              }}
            >
              {target.label}
            </Button>
          )}
          {!notification.read && (
            <Button size="xs" variant="ghost" onClick={() => markNotificationRead(notification.id)}>
              Mark read
            </Button>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Dismiss: ${notification.title}`}
        className="shrink-0"
        onClick={() => dismissNotification(notification.id)}
      >
        <X />
      </Button>
    </li>
  )
}

export function NotificationCenter() {
  const { notifications, unreadCount, markAllNotificationsRead, clearNotifications } = useOs()

  return (
    <PopoverContent
      side="top"
      align="end"
      sideOffset={12}
      className="w-[min(24rem,calc(100vw-1.5rem))] gap-0 overflow-hidden rounded-2xl p-0 shadow-overlay"
    >
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <h2 className="text-base font-semibold">Notifications</h2>
        <MockBadge />
        <div className="ml-auto flex gap-1">
          <Button size="xs" variant="ghost" disabled={unreadCount === 0} onClick={markAllNotificationsRead}>
            Mark all read
          </Button>
          <Button size="xs" variant="ghost" disabled={notifications.length === 0} onClick={clearNotifications}>
            Clear all
          </Button>
        </div>
      </div>
      {notifications.length === 0 ? (
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BellOff />
            </EmptyMedia>
            <EmptyTitle>You're all caught up</EmptyTitle>
            <EmptyDescription>Approvals, failures and deployments will appear here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="max-h-[min(28rem,60vh)] divide-y overflow-y-auto">
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} />
          ))}
        </ul>
      )}
    </PopoverContent>
  )
}
