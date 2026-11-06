import { create } from 'zustand';

import { initialNotifications, type AppNotification } from '@/lib/mock/notifications';

type NotificationsState = {
  items: AppNotification[];
  markRead: (id: string) => void;
  markAllRead: () => void;
};

export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: initialNotifications,

  markRead: (id) => {
    set((state) => ({
      items: state.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  },

  markAllRead: () => {
    set((state) => ({
      items: state.items.map((n) => ({ ...n, read: true })),
    }));
  },
}));

export function unreadCount(items: AppNotification[]) {
  return items.filter((n) => !n.read).length;
}
