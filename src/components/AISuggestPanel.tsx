import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Brain,
  Tag,
  AlertTriangle,
  ChevronRight,
  Loader2,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Copy,
  Check,
} from 'lucide-react';
import { triageRequest, type TriageResult } from '../lib/api';

interface AISuggestPanelProps {
  description: string;
  consoleErrors: number;
  onApply: (opts: {
    title?: string;
    priority?: string;
    category?: string;
    tags?: string[];
  }) => void;
  onViewRequest: (id: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#3b82f6',
};

const CONFIDENCE_LABEL = (c: number) => {
  if (c >= 0.8) return 'High confidence';
  if (c >= 0.6) return 'Medium confidence';
  return 'Low confidence';
};

export default function AISuggestPanel({
  description,
  consoleErrors,
  onApply,
  onViewRequest,
}: AISuggestPanelProps) {
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDescRef = useRef('');

  useEffect(() => {
    if (description.trim().length < 15) {
      setTriage(null);
      setError('');
      return;
    }

    // Debounce: wait 1.2s after user stops typing
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (description.trim() === lastDescRef.current) return;
      lastDescRef.current = description.trim();

      setLoading(true);
      setError('');
      setApplied(false);
      try {
        const result = await triageRequest(description, consoleErrors);
        setTriage(result);
      } catch {
        setError('AI triage unavailable');
      } finally {
        setLoading(false);
      }
    }, 1200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [description, consoleErrors]);

  const handleApplyAll = () => {
    if (!triage) return;
    onApply({
      title: triage.title,
      priority: triage.priority.priority,
      category: triage.category.category,
      tags: triage.tags,
    });
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  const handleCopyTitle = () => {
    if (!triage?.title) return;
    navigator.clipboard.writeText(triage.title);
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 1500);
  };

  if (description.trim().length < 15) return null;

  return (
    <AnimatePresence>
      {(loading || triage || error) && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden rounded-xl"
          style={{
            background: 'rgba(6, 182, 212, 0.04)',
            border: '1px solid rgba(6, 182, 212, 0.18)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ borderBottom: '1px solid rgba(6, 182, 212, 0.1)' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded flex items-center justify-center"
                style={{ background: 'rgba(6, 182, 212, 0.15)' }}
              >
                {loading ? (
                  <Loader2 size={11} className="animate-spin" style={{ color: '#22d3ee' }} />
                ) : (
                  <Brain size={11} style={{ color: '#22d3ee' }} />
                )}
              </div>
              <span className="text-[11px] font-semibold" style={{ color: '#22d3ee' }}>
                {loading ? 'AI Analyzing…' : 'AI Triage Suggestions'}
              </span>
            </div>
            {triage && !applied && (
              <button
                onClick={handleApplyAll}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all"
                style={{
                  background: 'rgba(6, 182, 212, 0.15)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  color: '#22d3ee',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)';
                }}
              >
                <Sparkles size={9} /> Apply All
              </button>
            )}
            {applied && (
              <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: '#22c55e' }}>
                <CheckCircle2 size={10} /> Applied!
              </span>
            )}
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-5 rounded animate-pulse"
                  style={{ background: 'rgba(6, 182, 212, 0.08)', width: `${60 + i * 10}%` }}
                />
              ))}
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="px-3 py-2 text-[10px]" style={{ color: '#94a3b8' }}>
              {error}
            </div>
          )}

          {/* Results */}
          {triage && !loading && (
            <div className="p-3 space-y-2.5">
              {/* Smart Title */}
              <div className="flex items-start gap-2">
                <Cpu size={11} className="mt-0.5 flex-shrink-0" style={{ color: '#64748b' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: '#475569' }}>
                      Smart Title
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <p
                      className="text-[11px] leading-snug flex-1"
                      style={{ color: '#e2e8f0' }}
                    >
                      {triage.title}
                    </p>
                    <button
                      onClick={handleCopyTitle}
                      className="flex-shrink-0 mt-0.5 transition-colors"
                      title="Copy title"
                      style={{ color: '#64748b' }}
                    >
                      {copiedTitle ? (
                        <Check size={10} style={{ color: '#22c55e' }} />
                      ) : (
                        <Copy size={10} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Priority */}
              <div className="flex items-center gap-2">
                <TrendingUp size={11} className="flex-shrink-0" style={{ color: '#64748b' }} />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: '#475569' }}>
                    Priority
                  </span>
                  <button
                    onClick={() => onApply({ priority: triage.priority.priority })}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold capitalize transition-all"
                    style={{
                      background: `${PRIORITY_COLORS[triage.priority.priority]}15`,
                      border: `1px solid ${PRIORITY_COLORS[triage.priority.priority]}40`,
                      color: PRIORITY_COLORS[triage.priority.priority],
                    }}
                    title="Apply this priority"
                  >
                    {triage.priority.priority}
                  </button>
                  <span className="text-[9px]" style={{ color: '#475569' }}>
                    {CONFIDENCE_LABEL(triage.priority.confidence)} · {triage.priority.reason}
                  </span>
                </div>
              </div>

              {/* Category */}
              <div className="flex items-center gap-2">
                <ChevronRight size={11} className="flex-shrink-0" style={{ color: '#64748b' }} />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: '#475569' }}>
                    Category
                  </span>
                  <button
                    onClick={() => onApply({ category: triage.category.category })}
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium capitalize transition-all"
                    style={{
                      background: 'rgba(168, 85, 247, 0.12)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      color: '#c084fc',
                    }}
                    title="Apply this category"
                  >
                    {triage.category.category}
                  </button>
                  <span className="text-[9px]" style={{ color: '#475569' }}>
                    {Math.round(triage.category.confidence * 100)}% match
                  </span>
                </div>
              </div>

              {/* Suggested Tags */}
              {triage.tags.length > 0 && (
                <div className="flex items-start gap-2">
                  <Tag size={11} className="flex-shrink-0 mt-0.5" style={{ color: '#64748b' }} />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: '#475569' }}>
                      Tags
                    </span>
                    {triage.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => onApply({ tags: [tag] })}
                        className="text-[10px] px-2 py-0.5 rounded-full transition-all"
                        style={{
                          background: 'rgba(6, 182, 212, 0.08)',
                          border: '1px solid rgba(6, 182, 212, 0.2)',
                          color: '#67e8f9',
                        }}
                        title={`Add tag: ${tag}`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Similar Requests */}
              {triage.similar_requests.length > 0 && (
                <div
                  className="rounded-lg p-2"
                  style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)' }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle size={10} style={{ color: '#f59e0b' }} />
                    <span className="text-[10px] font-semibold" style={{ color: '#f59e0b' }}>
                      Possible Duplicates
                    </span>
                  </div>
                  <div className="space-y-1">
                    {triage.similar_requests.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => onViewRequest(r.id)}
                        className="w-full flex items-center justify-between text-left px-2 py-1 rounded transition-colors"
                        style={{ background: 'rgba(0,0,0,0.2)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.2)'; }}
                      >
                        <span className="text-[10px] truncate" style={{ color: '#d97706', maxWidth: '70%' }}>
                          {r.id}: {r.title}
                        </span>
                        <span className="text-[9px] flex-shrink-0" style={{ color: '#92400e' }}>
                          {r.similarity}% match
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
