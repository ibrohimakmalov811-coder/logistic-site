"use client";

import * as React from "react";
import { Bell, CheckCheck, Clock, ExternalLink } from "lucide-react";
import { InAppNotificationEntity, notificationRepo, syncChannel } from "@/lib/data";
import { useTransFlowAuth } from "@/lib/data/client-auth-context";
import { useRouter } from "@/i18n/routing";

export function NotificationsPopover() {
  const router = useRouter();
  const { currentUser } = useTransFlowAuth();
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<InAppNotificationEntity[]>([]);

  const loadNotifications = React.useCallback(async () => {
    if (!currentUser) return;
    const list = await notificationRepo.listByUser(currentUser.id);
    setNotifications(list);
  }, [currentUser]);

  React.useEffect(() => {
    loadNotifications();

    const unsubscribe = syncChannel.subscribe((msg) => {
      if (msg.type === "NOTIFICATION_CREATED" || msg.type === "STORAGE_RESET") {
        loadNotifications();
      }
    });

    return () => unsubscribe();
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    await notificationRepo.markAllAsRead(currentUser.id);
    await loadNotifications();
  };

  const handleItemClick = async (notif: InAppNotificationEntity) => {
    if (!notif.isRead) {
      await notificationRepo.markAsRead(notif.id);
      await loadNotifications();
    }
    setOpen(false);

    if (notif.targetType === "order" && notif.targetId) {
      const prefix = currentUser?.role === "driver" ? "/app/driver/orders" : "/app/company/orders";
      router.push(`${prefix}/${notif.targetId}`);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Bildirishnomalar"
        onClick={() => setOpen((prev) => !prev)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-accent transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Bildirishnomalar ({notifications.length})
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                >
                  <CheckCheck className="h-3 w-3" />
                  {"Barchasini o'qilgan qilish"}
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-border/40 py-1">
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  {"Hozircha yangi bildirishnomalar yo'q."}
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => handleItemClick(notif)}
                    className={`w-full text-left p-2.5 rounded-xl transition-colors hover:bg-muted/50 flex items-start gap-2.5 ${
                      !notif.isRead ? "bg-primary/5" : ""
                    }`}
                  >
                    {!notif.isRead && (
                      <span className="mt-1 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold truncate text-foreground">
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(notif.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
