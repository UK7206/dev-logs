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
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-2xl p-6 min-h-[145px] relative overflow-hidden flex flex-col justify-between transition-all duration-300 cursor-pointer"
      style={{
        background: hovered ? `linear-gradient(135deg, ${bgColor}, ${color}10)` : bgColor,
        border: `1px solid ${hovered ? color : `${color}22`}`,
        boxShadow: hovered ? `0 10px 30px -10px ${color}30, 0 1px 1px ${color}50` : '0 4px 30px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)',
        transform: hovered ? 'translateY(-4px)' : 'none',
      }}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 animate-shimmer pointer-events-none opacity-30" />

      <div
        className="absolute inset-0 opacity-5 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at 80% 20%, ${color}, transparent 70%)`,
          opacity: hovered ? 0.15 : 0.05,
        }}
      />
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
            style={{ 
              background: hovered ? `${color}25` : `${color}18`, 
              border: `1px solid ${hovered ? color : `${color}30`}`,
              transform: hovered ? 'scale(1.1) rotate(5deg)' : 'none' 
            }}
          >
            <Icon size={20} style={{ color }} />
          </div>
          {hovered && (
            <motion.span 
              initial={{ opacity: 0, scale: 0.8 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70"
            >
              Active
            </motion.span>
          )}
        </div>
        
        <div className="mt-3">
          <div className="text-3xl font-extrabold tracking-tight mb-0.5" style={{ color }}>
            {animated}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </div>
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
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left p-4 rounded-2xl group transition-all relative overflow-hidden"
      style={{
        background: hovered ? `${color}08` : 'rgba(15, 23, 42, 0.6)',
        border: `1px solid ${hovered ? `${color}40` : 'rgba(51, 65, 85, 0.4)'}`,
        boxShadow: hovered ? `inset 4px 0 0 ${color}, 0 4px 20px -2px ${color}15` : 'none',
      }}
    >
      {/* Glowing left accent */}
      {hovered && (
        <span 
          className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
          style={{ 
            backgroundColor: color, 
            boxShadow: `0 0 10px ${color}, 0 0 20px ${color}` 
          }}
        />
      )}

      <div className="flex items-center gap-3 relative z-10 pl-1">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm" style={{ color: '#e2e8f0' }}>{label}</div>
          <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{description}</div>
        </div>
        <ChevronRight size={16} className="transition-transform duration-300" style={{ color: hovered ? color : '#334155', transform: hovered ? 'translateX(3px)' : 'none' }} />
      </div>
    </motion.button>
  );
}


// ---------------------------------------------------------------------------
// Main Home Dashboard
// ---------------------------------------------------------------------------
export default function HomeDashboard({ onClose, onOpenPanel, onOpenKanban, onOpenInsight }: HomeDashboardProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [time, setTime] = useState(new Date());

  // Live clock updates
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  const recentlyResolved = [...requests]
    .filter((r) => r.status === 'completed')
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
    .slice(0, 3);

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const totalForPipeline = stats.submitted + stats.in_progress + stats.in_testing + stats.completed;
  const pctSubmitted = totalForPipeline > 0 ? (stats.submitted / totalForPipeline) * 100 : 0;
  const pctInProgress = totalForPipeline > 0 ? (stats.in_progress / totalForPipeline) * 100 : 0;
  const pctTesting = totalForPipeline > 0 ? (stats.in_testing / totalForPipeline) * 100 : 0;
  const pctCompleted = totalForPipeline > 0 ? (stats.completed / totalForPipeline) * 100 : 0;

  const timeString = time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = time.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

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
            className="w-10 h-10 rounded-xl flex items-center justify-center animate-float"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold animate-glow-pulse"
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
          <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex-1"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">
                  Good {time.getHours() < 12 ? 'morning' : time.getHours() < 17 ? 'afternoon' : 'evening'} 👋
                </h2>
                <span className="text-xs font-mono text-slate-400 bg-slate-900/60 px-3 py-1 rounded-lg border border-slate-800/80 self-start sm:self-auto shadow-inner">
                  {dateString} • {timeString}
                </span>
              </div>
              <p className="text-sm" style={{ color: '#64748b' }}>
                You have <span style={{ color: '#22d3ee', fontWeight: 600 }}>{stats.submitted}</span> pending and{' '}
                <span style={{ color: '#3b82f6', fontWeight: 600 }}>{stats.in_progress}</span> in progress
              </p>
            </motion.div>

            {/* Completion ring and pipeline progress */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="flex flex-col items-end gap-3 min-w-[240px] w-full md:w-auto"
            >
              <div className="flex items-center gap-3 self-end">
                <span className="text-[10px]" style={{ color: '#475569' }}>Completion Velocity</span>
                <div className="relative w-12 h-12">
                  <svg width="48" height="48" className="rotate-[-90deg]">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(30,41,59,0.8)" strokeWidth="4" />
                    <circle
                      cx="24" cy="24" r="20" fill="none"
                      stroke="#22d3ee" strokeWidth="4"
                      strokeDasharray={`${2 * Math.PI * 20}`}
                      strokeDashoffset={`${2 * Math.PI * 20 * (1 - completionRate / 100)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1s ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold" style={{ color: '#22d3ee' }}>{completionRate}%</span>
                  </div>
                </div>
              </div>

              {/* Segmented Pipeline Progress Bar */}
              <div className="w-full bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 shadow-inner">
                <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1.5 font-medium">
                  <span>Pipeline Flow</span>
                  <span>{totalForPipeline} Items</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                  <div className="bg-[#f59e0b] h-full transition-all duration-500" style={{ width: `${pctSubmitted}%` }} title={`Submitted: ${stats.submitted}`} />
                  <div className="bg-[#3b82f6] h-full transition-all duration-500" style={{ width: `${pctInProgress}%` }} title={`In Progress: ${stats.in_progress}`} />
                  <div className="bg-[#a855f7] h-full transition-all duration-500" style={{ width: `${pctTesting}%` }} title={`In Testing: ${stats.in_testing}`} />
                  <div className="bg-[#22c55e] h-full transition-all duration-500" style={{ width: `${pctCompleted}%` }} title={`Completed: ${stats.completed}`} />
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                  <span className="text-[9px] flex items-center gap-1 text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" /> Sub: {stats.submitted}
                  </span>
                  <span className="text-[9px] flex items-center gap-1 text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" /> Prog: {stats.in_progress}
                  </span>
                  <span className="text-[9px] flex items-center gap-1 text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" /> Test: {stats.in_testing}
                  </span>
                  <span className="text-[9px] flex items-center gap-1 text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" /> Done: {stats.completed}
                  </span>
                </div>
              </div>
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
              className="lg:col-span-3 rounded-2xl p-6 flex flex-col justify-between"
              style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(10px)' }}
            >
              <div>
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
                  <div className="space-y-1">
                    {recent.map((req, i) => (
                      <ActivityItem key={req.id} req={req} delay={0.05 * i} />
                    ))}
                  </div>
                )}
              </div>

              {/* Recently Resolved Section */}
              {recentlyResolved.length > 0 && (
                <div className="mt-6 pt-5 border-t border-slate-800/80">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={14} className="text-green-400 animate-pulse" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-green-400">Recently Resolved</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {recentlyResolved.map((req, idx) => (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * idx }}
                        className="bg-green-950/10 border border-green-500/15 rounded-xl p-3 flex flex-col justify-between hover:border-green-500/40 hover:bg-green-950/20 transition-all duration-300"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-mono text-green-500/80">{req.id}</span>
                            <span className="text-[9px] text-slate-500">
                              {new Date(req.updated_at || req.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-200 line-clamp-2">{req.title}</p>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-[9px] text-green-400 font-semibold">
                          <CheckCircle2 size={10} />
                          <span>Resolved</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
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

