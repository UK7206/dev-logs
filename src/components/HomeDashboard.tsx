import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Bug,
  LayoutDashboard,
  Activity,
  CheckCircle2,
  Clock,
  Zap,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  PlayCircle,
  FlaskConical,
  Circle,
  ChevronRight,
  Sparkles,
  X,
  HelpCircle,
} from 'lucide-react';
import { fetchRequests, subscribeToEvents } from '../lib/api';
import type { DevRequest } from '../types';
import ShortcutsHelpModal from './ShortcutsHelpModal';

interface HomeDashboardProps {
  onClose: () => void;
  onOpenPanel: () => void;
  onOpenKanban: () => void;
  onOpenInsight: () => void;
}

// ---------------------------------------------------------------------------
// Animated counter hook
// ---------------------------------------------------------------------------
function useCounter(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(target * eased));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  delay = 0,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  delay?: number;
}) {
  const animated = useCounter(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: bgColor,
        border: `1px solid ${color}22`,
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background: `radial-gradient(circle at 80% 20%, ${color}, transparent 70%)`,
        }}
      />
      <div className="relative z-10">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
        <div className="text-3xl font-bold tracking-tight mb-1" style={{ color }}>
          {animated}
        </div>
        <div className="text-xs font-medium" style={{ color: '#64748b' }}>
          {label}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Recent activity item
// ---------------------------------------------------------------------------
function ActivityItem({ req, delay = 0 }: { req: DevRequest; delay?: number }) {
  const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
    submitted: { color: '#f59e0b', icon: Circle, label: 'Submitted' },
    in_progress: { color: '#3b82f6', icon: PlayCircle, label: 'In Progress' },
    in_testing: { color: '#a855f7', icon: FlaskConical, label: 'In Testing' },
    completed: { color: '#22c55e', icon: CheckCircle2, label: 'Completed' },
    deferred: { color: '#64748b', icon: Clock, label: 'Deferred' },
    cancelled: { color: '#ef4444', icon: X, label: 'Cancelled' },
  };
  const cfg = statusConfig[req.status] || statusConfig.submitted;
  const Icon = cfg.icon;
  const priorityColors: Record<string, string> = {
    critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#3b82f6',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-start gap-3 py-3"
      style={{ borderBottom: '1px solid rgba(30, 41, 59, 0.6)' }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}
      >
        <Icon size={13} style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-mono" style={{ color: '#475569' }}>{req.id}</span>
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide"
            style={{ background: `${priorityColors[req.priority]}18`, color: priorityColors[req.priority], border: `1px solid ${priorityColors[req.priority]}30` }}
          >
            {req.priority}
          </span>
        </div>
        <p className="text-sm font-medium truncate" style={{ color: '#e2e8f0' }}>{req.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px]" style={{ color: cfg.color }}>{cfg.label}</span>
          <span className="text-[10px]" style={{ color: '#334155' }}>·</span>
          <span className="text-[10px]" style={{ color: '#475569' }}>
            {new Date(req.updated_at || req.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Quick action button
// ---------------------------------------------------------------------------
function QuickAction({
  icon: Icon,
  label,
  description,
  color,
  onClick,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
  onClick: () => void;
  delay?: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left p-4 rounded-2xl group transition-all"
      style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: `1px solid rgba(51, 65, 85, 0.4)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${color}50`;
        e.currentTarget.style.background = `${color}08`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(51, 65, 85, 0.4)';
        e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm" style={{ color: '#e2e8f0' }}>{label}</div>
          <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{description}</div>
        </div>
        <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" style={{ color: '#334155' }} />
      </div>
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Main Home Dashboard
// ---------------------------------------------------------------------------
export default function HomeDashboard({ onClose, onOpenPanel, onOpenKanban, onOpenInsight }: HomeDashboardProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { data: requests = [], refetch } = useQuery({
    queryKey: ['requests-home'],
    queryFn: () => fetchRequests(),
    refetchInterval: 30_000,
  });

  // Real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToEvents((type) => {
      if (['request_created', 'status_change'].includes(type)) {
        refetch();
      }
    });
    return () => unsubscribe();
  }, [refetch]);

  const stats = {
    total: requests.length,
    submitted: requests.filter((r) => r.status === 'submitted').length,
    in_progress: requests.filter((r) => r.status === 'in_progress').length,
    in_testing: requests.filter((r) => r.status === 'in_testing').length,
    completed: requests.filter((r) => r.status === 'completed').length,
    critical: requests.filter((r) => r.priority === 'critical' && r.status !== 'completed').length,
  };

  const recent = [...requests]
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
    .slice(0, 6);

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[99999] bg-[#030712] text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)', filter: 'blur(60px)' }}
        />
        <div
          className="absolute -bottom-40 -right-20 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)', filter: 'blur(60px)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #22d3ee, transparent 70%)', filter: 'blur(80px)' }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5" style={{ borderBottom: '1px solid rgba(30, 41, 59, 0.6)' }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(6,182,212,0.3)' }}
          >
            <Bug size={20} style={{ color: '#22d3ee' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: '#f1f5f9' }}>
              dev-logs
            </h1>
            <p className="text-xs" style={{ color: '#475569' }}>AI-centric dev tracking platform</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          {stats.critical > 0 && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
            >
              <AlertTriangle size={12} />
              {stats.critical} Critical
            </motion.div>
          )}
          <button
            onClick={() => setShowShortcuts(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: '#475569' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; e.currentTarget.style.color = '#a855f7'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
            title="Keyboard Shortcuts Guide"
          >
            <HelpCircle size={16} />
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: '#475569' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
          >
            <X size={16} />
          </button>
        </motion.div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {/* Welcome + completion */}
          <div className="flex items-start justify-between mb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-1" style={{ color: '#f1f5f9' }}>
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'} 👋
              </h2>
              <p className="text-sm" style={{ color: '#64748b' }}>
                You have <span style={{ color: '#22d3ee', fontWeight: 600 }}>{stats.submitted}</span> pending and{' '}
                <span style={{ color: '#3b82f6', fontWeight: 600 }}>{stats.in_progress}</span> in progress
              </p>
            </motion.div>

            {/* Completion ring */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="flex flex-col items-center gap-1"
            >
              <div className="relative w-16 h-16">
                <svg width="64" height="64" className="rotate-[-90deg]">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(30,41,59,0.8)" strokeWidth="5" />
                  <circle
                    cx="32" cy="32" r="26" fill="none"
                    stroke="#22d3ee" strokeWidth="5"
                    strokeDasharray={`${2 * Math.PI * 26}`}
                    strokeDashoffset={`${2 * Math.PI * 26 * (1 - completionRate / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold" style={{ color: '#22d3ee' }}>{completionRate}%</span>
                </div>
              </div>
              <span className="text-[10px]" style={{ color: '#475569' }}>Complete</span>
            </motion.div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <StatCard label="Total Requests" value={stats.total} icon={Bug} color="#22d3ee" bgColor="rgba(6,182,212,0.06)" delay={0.05} />
            <StatCard label="Pending" value={stats.submitted} icon={Circle} color="#f59e0b" bgColor="rgba(245,158,11,0.06)" delay={0.1} />
            <StatCard label="In Progress" value={stats.in_progress} icon={PlayCircle} color="#3b82f6" bgColor="rgba(59,130,246,0.06)" delay={0.15} />
            <StatCard label="In Testing" value={stats.in_testing} icon={FlaskConical} color="#a855f7" bgColor="rgba(168,85,247,0.06)" delay={0.2} />
            <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} color="#22c55e" bgColor="rgba(34,197,94,0.06)" delay={0.25} />
          </div>

          {/* Bottom grid: recent + quick actions */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="lg:col-span-3 rounded-2xl p-6"
              style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(10px)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity size={16} style={{ color: '#22d3ee' }} />
                  <h3 className="font-semibold text-sm" style={{ color: '#e2e8f0' }}>Recent Activity</h3>
                </div>
                <button
                  onClick={onOpenKanban}
                  className="flex items-center gap-1 text-xs transition-colors"
                  style={{ color: '#475569' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#22d3ee'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; }}
                >
                  View Board <ArrowRight size={12} />
                </button>
              </div>

              {recent.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.1)' }}>
                    <Sparkles size={20} style={{ color: '#22d3ee' }} />
                  </div>
                  <p className="text-sm" style={{ color: '#475569' }}>No requests yet. Submit your first!</p>
                  <button
                    onClick={onOpenPanel}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', color: '#22d3ee' }}
                  >
                    <Bug size={14} /> Submit Request
                  </button>
                </div>
              ) : (
                <div>
                  {recent.map((req, i) => (
                    <ActivityItem key={req.id} req={req} delay={0.05 * i} />
                  ))}
                </div>
              )}
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="lg:col-span-2 flex flex-col gap-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} style={{ color: '#f59e0b' }} />
                <h3 className="font-semibold text-sm" style={{ color: '#e2e8f0' }}>Quick Actions</h3>
              </div>

              <QuickAction
                icon={Bug}
                label="Submit Request"
                description="Report a bug, feature, or improvement"
                color="#22d3ee"
                onClick={onOpenPanel}
                delay={0.4}
              />
              <QuickAction
                icon={LayoutDashboard}
                label="Kanban Board"
                description="Drag & drop task management"
                color="#3b82f6"
                onClick={onOpenKanban}
                delay={0.45}
              />
              <QuickAction
                icon={Activity}
                label="Insight Engine"
                description="Analytics, tools & DB explorer"
                color="#a855f7"
                onClick={onOpenInsight}
                delay={0.5}
              />
              <QuickAction
                icon={TrendingUp}
                label="Analytics"
                description="Charts, velocity & heatmaps"
                color="#22c55e"
                onClick={() => { onOpenInsight(); }}
                delay={0.55}
              />
            </motion.div>
          </div>
        </div>
      </div>
      <ShortcutsHelpModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
