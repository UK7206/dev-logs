import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellRing,
  X,
  CheckCircle2,
  PlayCircle,
  FlaskConical,
  MessageSquare,
  Paperclip,
  AlertTriangle,
  Circle,
  Check,
  CheckCheck,
} from 'lucide-react';
import { subscribeToEvents } from '../lib/api';

export interface Notification {
  id: string;
  type: 'request_created' | 'status_change' | 'comment_added' | 'attachment_added' | 'priority_change' | 'due_soon';
  title: string;
  message: string;
  requestId?: string;
  timestamp: string;
  read: boolean;
}

const STORAGE_KEY = 'dev-logs-notifications';
const MAX_NOTIFICATIONS = 50;

function loadNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveNotifications(notifications: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
  } catch { /* ignore */ }
}

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'request_created': return { icon: Circle, color: '#22d3ee' };
    case 'status_change': return { icon: PlayCircle, color: '#3b82f6' };
    case 'comment_added': return { icon: MessageSquare, color: '#a855f7' };
    case 'attachment_added': return { icon: Paperclip, color: '#f59e0b' };
    case 'priority_change': return { icon: AlertTriangle, color: '#ef4444' };
    case 'due_soon': return { icon: AlertTriangle, color: '#f97316' };
    default: return { icon: Bell, color: '#64748b' };
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface NotificationBellProps {
  onNavigate?: (requestId: string) => void;
}

export default function NotificationBell({ onNavigate }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>(() => loadNotifications());
  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback((notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: Notification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => {
      const updated = [newNotif, ...prev].slice(0, MAX_NOTIFICATIONS);
      saveNotifications(updated);
      return updated;
    });

    // Shake the bell
    setShake(true);
    setTimeout(() => setShake(false), 600);

    // Browser notification (if permitted)
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`dev-logs: ${notif.title}`, {
          body: notif.message,
          icon: '/favicon.svg',
          tag: 'dev-logs',
        });
      } catch { /* ignore */ }
    }
  }, []);

  // Subscribe to SSE events
  useEffect(() => {
    const unsubscribe = subscribeToEvents((type, data: any) => {
      switch (type) {
        case 'request_created':
          addNotification({
            type: 'request_created',
            title: 'New Request Created',
            message: data?.title || 'A new request was submitted',
            requestId: data?.id,
          });
          break;
        case 'status_change':
          addNotification({
            type: 'status_change',
            title: 'Status Changed',
            message: `${data?.id}: ${data?.old_status} → ${data?.new_status}`,
            requestId: data?.id,
          });
          break;
        case 'comment_added':
          addNotification({
            type: 'comment_added',
            title: 'New Comment',
            message: data?.title ? `Comment on: ${data.title}` : 'A comment was added',
            requestId: data?.id,
          });
          break;
      }
    });
    return () => unsubscribe();
  }, [addNotification]);

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAllRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(updated);
      return updated;
    });
  };

  const markRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => n.id === id ? { ...n, read: true } : n);
      saveNotifications(updated);
      return updated;
    });
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      saveNotifications(updated);
      return updated;
    });
  };

  const clearAll = () => {
    setNotifications([]);
    saveNotifications([]);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <motion.button
        animate={shake ? { rotate: [0, -15, 15, -10, 10, -5, 5, 0] } : {}}
        transition={{ duration: 0.5 }}
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) markAllRead();
        }}
        className="relative w-7 h-7 rounded-md flex items-center justify-center transition-colors"
        style={{ color: unreadCount > 0 ? '#22d3ee' : '#94a3b8' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(6,182,212,0.1)'; e.currentTarget.style.color = '#22d3ee'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = unreadCount > 0 ? '#22d3ee' : '#94a3b8'; }}
        title="Notifications"
      >
        {unreadCount > 0 ? <BellRing size={14} /> : <Bell size={14} />}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
            style={{ background: '#ef4444', color: '#fff', border: '1.5px solid rgba(10,15,30,0.9)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-9 w-80 rounded-xl shadow-2xl z-50 overflow-hidden"
            style={{
              background: 'rgba(10, 15, 30, 0.97)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(6, 182, 212, 0.15)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid rgba(30, 41, 59, 0.6)' }}
            >
              <div className="flex items-center gap-2">
                <Bell size={13} style={{ color: '#22d3ee' }} />
                <span className="text-[12px] font-semibold" style={{ color: '#e2e8f0' }}>
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={markAllRead}
                      className="text-[10px] transition-colors"
                      style={{ color: '#475569' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#22d3ee'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; }}
                      title="Mark all as read"
                    >
                      <CheckCheck size={13} />
                    </button>
                    <button
                      onClick={clearAll}
                      className="text-[10px] transition-colors"
                      style={{ color: '#475569' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; }}
                      title="Clear all"
                    >
                      <X size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Notifications list */}
            <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}
                  >
                    <Bell size={18} style={{ color: '#334155' }} />
                  </div>
                  <span className="text-[11px]" style={{ color: '#475569' }}>No notifications yet</span>
                </div>
              ) : (
                <AnimatePresence>
                  {notifications.map((notif, i) => {
                    const { icon: Icon, color } = getNotificationIcon(notif.type);
                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10, height: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.2 }}
                        className="flex items-start gap-3 px-4 py-3 group cursor-pointer transition-colors"
                        style={{
                          background: notif.read ? 'transparent' : 'rgba(6, 182, 212, 0.04)',
                          borderBottom: '1px solid rgba(30, 41, 59, 0.4)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(30,41,59,0.4)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(6, 182, 212, 0.04)'; }}
                        onClick={() => {
                          markRead(notif.id);
                          if (notif.requestId && onNavigate) {
                            onNavigate(notif.requestId);
                            setOpen(false);
                          }
                        }}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: `${color}15`, border: `1px solid ${color}30` }}
                        >
                          <Icon size={13} style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold truncate" style={{ color: '#e2e8f0' }}>
                              {notif.title}
                            </span>
                            {!notif.read && (
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22d3ee' }} />
                            )}
                          </div>
                          <p className="text-[10px] truncate mt-0.5" style={{ color: '#64748b' }}>
                            {notif.message}
                          </p>
                          <span className="text-[9px] mt-1 block" style={{ color: '#334155' }}>
                            {relativeTime(notif.timestamp)}
                          </span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                          style={{ color: '#475569' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; }}
                        >
                          <X size={12} />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
