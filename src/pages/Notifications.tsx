import React, { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, BellOff, Check, CheckCheck, Trash2, X,
  CheckSquare, Clock, Calendar, User, AlertTriangle,
  MessageSquare, Info, Megaphone, Settings
} from 'lucide-react';
import { format, isToday, isYesterday, parseISO, formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';

// ─── Supabase ────────────────────────────────────────────────────────────────


// ─── Types ───────────────────────────────────────────────────────────────────
type NotificationType = 'task' | 'leave' | 'roster' | 'comp_off' | 'general' | 'system';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  created_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
type TabKey = 'all' | 'unread' | 'task' | 'leave' | 'roster' | 'other';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'task', label: 'Tasks' },
  { key: 'leave', label: 'Leave' },
  { key: 'roster', label: 'Roster' },
  { key: 'other', label: 'Other' },
];

const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  task: <CheckSquare size={16} />,
  leave: <Clock size={16} />,
  roster: <Calendar size={16} />,
  comp_off: <User size={16} />,
  general: <Megaphone size={16} />,
  system: <Settings size={16} />,
};

const TYPE_COLORS: Record<NotificationType, string> = {
  task: 'bg-indigo-100 text-indigo-600',
  leave: 'bg-amber-100 text-amber-600',
  roster: 'bg-blue-100 text-blue-600',
  comp_off: 'bg-purple-100 text-purple-600',
  general: 'bg-green-100 text-green-600',
  system: 'bg-gray-100 text-gray-600',
};

function getTypeGroup(type: NotificationType): TabKey {
  if (type === 'task') return 'task';
  if (type === 'leave' || type === 'comp_off') return 'leave';
  if (type === 'roster') return 'roster';
  return 'other';
}

function groupByDate(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const older: Notification[] = [];

  for (const n of notifications) {
    const d = parseISO(n.created_at);
    if (isToday(d)) today.push(n);
    else if (isYesterday(d)) yesterday.push(n);
    else older.push(n);
  }

  const groups = [];
  if (today.length > 0) groups.push({ label: 'Today', items: today });
  if (yesterday.length > 0) groups.push({ label: 'Yesterday', items: yesterday });
  if (older.length > 0) groups.push({ label: 'Older', items: older });
  return groups;
}

// ─── Toast ───────────────────────────────────────────────────────────────────
interface ToastMsg { id: string; type: 'success' | 'error'; title: string }

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const show = (type: ToastMsg['type'], title: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, title }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };
  return {
    toasts, dismiss: (id: string) => setToasts(prev => prev.filter(t => t.id !== id)),
    success: (t: string) => show('success', t),
    error: (t: string) => show('error', t),
  };
}

function ToastContainer({ toasts, dismiss }: { toasts: ToastMsg[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={cn('flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg min-w-[240px] border',
          t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800')}>
          <p className="font-medium text-sm flex-1">{t.title}</p>
          <button onClick={() => dismiss(t.id)}><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

// ─── Notification Item ────────────────────────────────────────────────────────
function NotificationItem({
  notification, onRead, onDelete,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const type = notification.type as NotificationType;
  const icon = TYPE_ICONS[type] ?? <Info size={16} />;
  const color = TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-600';
  const timeAgo = formatDistanceToNow(parseISO(notification.created_at), { addSuffix: true });

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer group',
        notification.is_read
          ? 'bg-white border-gray-200 hover:border-gray-300'
          : 'bg-indigo-50/50 border-indigo-200 hover:border-indigo-300',
      )}
      onClick={() => !notification.is_read && onRead(notification.id)}
    >
      {/* Icon */}
      <div className={cn('p-2 rounded-lg shrink-0 mt-0.5', color)}>{icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className={cn('text-sm font-medium leading-tight', notification.is_read ? 'text-gray-700' : 'text-gray-900')}>
              {notification.title}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{notification.message}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!notification.is_read && (
              <div className="w-2 h-2 bg-indigo-500 rounded-full" title="Unread" />
            )}
            <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo}</span>
          </div>
        </div>
      </div>

      {/* Actions (shown on hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!notification.is_read && (
          <button
            onClick={e => { e.stopPropagation(); onRead(notification.id); }}
            title="Mark as read"
            className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-600"
          >
            <Check size={13} />
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); onDelete(notification.id); }}
          title="Delete"
          className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Notifications() {
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>('all');

  // ── Data ──
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000, // poll every 30s
  });

  // ── Filters ──
  const filtered = useMemo(() => {
    return notifications.filter(n => {
      if (tab === 'unread') return !n.is_read;
      if (tab === 'task') return n.type === 'task';
      if (tab === 'leave') return n.type === 'leave' || n.type === 'comp_off';
      if (tab === 'roster') return n.type === 'roster';
      if (tab === 'other') return !['task', 'leave', 'roster', 'comp_off'].includes(n.type);
      return true;
    });
  }, [notifications, tab]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);
  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  // ── Mutations ──
  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (e: any) => toast.error('Failed to mark read'),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast.success('All marked as read'); },
    onError: () => toast.error('Failed to mark all read'),
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: () => toast.error('Failed to delete'),
  });

  const deleteAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notifications').delete().eq('is_read', true);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast.success('Read notifications cleared'); },
    onError: () => toast.error('Failed to clear'),
  });

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />

      {/* ── Header ── */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell size={22} className="text-gray-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
              <p className="text-sm text-gray-500">{unreadCount} unread</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending || unreadCount === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <CheckCheck size={14} /> Mark All Read
            </button>
            <button
              onClick={() => deleteAllRead.mutate()}
              disabled={deleteAllRead.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 size={14} /> Delete Read
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200 -mb-4">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5',
                tab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {t.label}
              {t.key === 'unread' && unreadCount > 0 && (
                <span className="bg-indigo-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            Loading notifications...
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <BellOff size={48} className="mb-4 opacity-50" />
            <p className="font-medium text-gray-500">No notifications</p>
            <p className="text-sm mt-1">
              {tab === 'unread' ? "You're all caught up!" : 'Nothing to show for this filter'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 max-w-2xl mx-auto">
            {grouped.map(group => (
              <div key={group.label}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{group.label}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">{group.items.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {group.items.map(n => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onRead={id => markRead.mutate(id)}
                      onDelete={id => deleteNotification.mutate(id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
