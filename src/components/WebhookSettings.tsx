import React, { useState, useEffect } from 'react';
import {
  Webhook, Save, Send, CheckCircle2, AlertTriangle, Zap,
  Slack, MessageSquare, Globe, Copy, Check, Eye, EyeOff,
  RefreshCw, Trash2, Plus, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────
type WebhookType = 'discord' | 'slack' | 'custom';

interface WebhookConfig {
  url: string;
  type: WebhookType;
  enabled_events: string[];
  custom_name: string;
}

const DEFAULT_CONFIG: WebhookConfig = {
  url: '',
  type: 'discord',
  enabled_events: ['request_created', 'status_change', 'priority_change'],
  custom_name: 'dev-logs',
};

// ─── All supported events ─────────────────────────────────────────────────────
const ALL_EVENTS = [
  { id: 'request_created',  label: 'Request Created',  color: '#22c55e', desc: 'Fired when a new bug/feature is submitted' },
  { id: 'status_change',    label: 'Status Changed',   color: '#3b82f6', desc: 'Fired when a ticket moves between stages' },
  { id: 'priority_change',  label: 'Priority Changed', color: '#f59e0b', desc: 'Fired when urgency is escalated/reduced' },
  { id: 'comment_added',    label: 'Comment Added',    color: '#a855f7', desc: 'Fired when someone comments on a ticket' },
  { id: 'attachment_added', label: 'File Attached',    color: '#06b6d4', desc: 'Fired when a file is uploaded to a ticket' },
];

// ─── Platform info ────────────────────────────────────────────────────────────
const PLATFORMS: { id: WebhookType; label: string; icon: React.ElementType; color: string; placeholder: string; helpUrl: string }[] = [
  {
    id: 'discord',
    label: 'Discord',
    icon: MessageSquare,
    color: '#5865f2',
    placeholder: 'https://discord.com/api/webhooks/12345/abc...',
    helpUrl: 'https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks',
  },
  {
    id: 'slack',
    label: 'Slack',
    icon: Slack,
    color: '#4a154b',
    placeholder: 'https://hooks.slack.com/services/T.../B.../...',
    helpUrl: 'https://api.slack.com/messaging/webhooks',
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: Globe,
    color: '#22d3ee',
    placeholder: 'https://your-server.com/webhook',
    helpUrl: '',
  },
];

// ─── Message preview ──────────────────────────────────────────────────────────
function DiscordPreview({ name }: { name: string }) {
  return (
    <div className="rounded-lg p-4 font-mono text-xs leading-relaxed"
      style={{ background: '#36393f', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-base"
          style={{ background: '#5865f2' }}>🐛</div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-sm" style={{ color: '#fff' }}>{name || 'dev-logs'}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#5865f2', color: '#fff' }}>BOT</span>
            <span className="text-xs" style={{ color: '#72767d' }}>Today at 4:20 PM</span>
          </div>
          <div className="rounded overflow-hidden" style={{ borderLeft: '4px solid #22c55e' }}>
            <div className="p-3" style={{ background: '#2f3136' }}>
              <div className="font-bold mb-1" style={{ color: '#22c55e' }}>🐛 New Request: REQ-042</div>
              <div className="text-xs mb-2" style={{ color: '#dcddde' }}>Login button not responding on mobile Safari</div>
              <div className="flex gap-4 text-xs" style={{ color: '#72767d' }}>
                <span>🔴 Priority: <span style={{ color: '#ef4444' }}>Critical</span></span>
                <span>📁 Category: Bug</span>
                <span>👤 By: dev-team</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlackPreview({ name }: { name: string }) {
  return (
    <div className="rounded-lg p-4 font-mono text-xs leading-relaxed"
      style={{ background: '#1a1d21', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-sm"
          style={{ background: '#4a154b' }}>🐛</div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-sm" style={{ color: '#fff' }}>{name || 'dev-logs'}</span>
            <span className="text-xs" style={{ color: '#ababad' }}>4:20 PM</span>
          </div>
          <div className="rounded p-3" style={{ background: '#222529', borderLeft: '4px solid #22c55e' }}>
            <div className="font-bold mb-1" style={{ color: '#fff' }}>🐛 New Request Submitted</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2">
              {[['ID', 'REQ-042'], ['Status', 'Submitted'], ['Priority', '🔴 Critical'], ['Category', 'Bug']].map(([k, v]) => (
                <React.Fragment key={k}>
                  <span style={{ color: '#ababad' }}>{k}</span>
                  <span style={{ color: '#fff' }}>{v}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WebhookSettings() {
  const [config, setConfig] = useState<WebhookConfig>(DEFAULT_CONFIG);
  const [isLoading,  setIsLoading]  = useState(true);
  const [isSaving,   setIsSaving]   = useState(false);
  const [isTesting,  setIsTesting]  = useState(false);
  const [showUrl,    setShowUrl]    = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Load saved settings
  useEffect(() => {
    fetch('/api/system/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setConfig({
            url:             d.settings.webhook_url    ?? '',
            type:            d.settings.webhook_type   ?? 'discord',
            enabled_events:  d.settings.webhook_events ?? DEFAULT_CONFIG.enabled_events,
            custom_name:     d.settings.webhook_name   ?? 'dev-logs',
          });
        }
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setIsLoading(false));
  }, []);

  const platform = PLATFORMS.find((p) => p.id === config.type) ?? PLATFORMS[0];

  const update = (patch: Partial<WebhookConfig>) => setConfig((c) => ({ ...c, ...patch }));

  const toggleEvent = (id: string) => {
    update({
      enabled_events: config.enabled_events.includes(id)
        ? config.enabled_events.filter((e) => e !== id)
        : [...config.enabled_events, id],
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.url.trim()) { toast.error('Enter a webhook URL first'); return; }
    setIsSaving(true);
    try {
      const res = await fetch('/api/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook_url:    config.url,
          webhook_type:   config.type,
          webhook_events: config.enabled_events,
          webhook_name:   config.custom_name,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Webhook configuration saved!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config.url.trim()) { toast.error('Enter a webhook URL first'); return; }
    setIsTesting(true);
    setTestResult(null);
    try {
      // Save first, then fire test ping via backend
      await fetch('/api/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook_url:    config.url,
          webhook_type:   config.type,
          webhook_events: config.enabled_events,
          webhook_name:   config.custom_name,
        }),
      });

      const res = await fetch('/api/ai/webhook-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: config.url, type: config.type, name: config.custom_name }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setTestResult({ ok: true,  msg: `Test ping delivered! Status: ${data.http_status ?? 'OK'}` });
        toast.success('Webhook test delivered ✓');
      } else {
        setTestResult({ ok: false, msg: data.detail || 'Delivery failed' });
        toast.error('Test failed: ' + (data.detail || 'unknown error'));
      }
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.message });
      toast.error('Test failed: ' + err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(config.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const clearConfig = () => {
    setConfig(DEFAULT_CONFIG);
    setTestResult(null);
  };

  if (isLoading) return (
    <div className="p-8 space-y-4 animate-pulse">
      <div className="h-8 w-64 rounded-lg" style={{ background: 'rgba(30,41,59,0.5)' }} />
      <div className="h-40 rounded-xl" style={{ background: 'rgba(30,41,59,0.3)' }} />
    </div>
  );

  return (
    <div className="p-6 h-full overflow-y-auto text-white">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <Webhook size={20} style={{ color: '#818cf8' }} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Webhook Settings</h2>
              <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Fire rich-formatted messages to Discord, Slack, or any HTTP endpoint</p>
            </div>
          </div>
          <button onClick={clearConfig} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
            <Trash2 size={12} /> Reset
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left: Config ─────────────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Platform selector */}
            <div className="rounded-xl p-5 space-y-4"
              style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(30,41,59,0.7)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
                Platform
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map((p) => {
                  const PIcon = p.icon;
                  const active = config.type === p.id;
                  return (
                    <button key={p.id} onClick={() => update({ type: p.id })}
                      className="flex flex-col items-center gap-2 py-3 rounded-xl text-xs font-medium transition-all"
                      style={{
                        background: active ? `${p.color}18` : 'rgba(30,41,59,0.4)',
                        border: `1.5px solid ${active ? p.color : 'rgba(51,65,85,0.5)'}`,
                        color: active ? p.color : '#64748b',
                      }}>
                      <PIcon size={18} />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* URL + Name config */}
            <form onSubmit={handleSave} className="rounded-xl p-5 space-y-4"
              style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(30,41,59,0.7)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
                Configuration
              </h3>

              {/* Bot name */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                  Bot / Username
                </label>
                <input
                  type="text"
                  value={config.custom_name}
                  onChange={(e) => update({ custom_name: e.target.value })}
                  placeholder="dev-logs"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                  style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(51,65,85,0.5)', color: '#e2e8f0' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = platform.color; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(51,65,85,0.5)'; }}
                />
              </div>

              {/* Webhook URL */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                  Webhook URL
                </label>
                <div className="relative">
                  <input
                    type={showUrl ? 'text' : 'password'}
                    value={config.url}
                    onChange={(e) => update({ url: e.target.value })}
                    placeholder={platform.placeholder}
                    className="w-full rounded-lg px-3 py-2 pr-20 text-sm outline-none transition-colors font-mono"
                    style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(51,65,85,0.5)', color: '#e2e8f0' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = platform.color; }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(51,65,85,0.5)'; }}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button type="button" onClick={() => setShowUrl((v) => !v)}
                      className="p-1 rounded transition-colors" style={{ color: '#475569' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; }}>
                      {showUrl ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    {config.url && (
                      <button type="button" onClick={copyUrl}
                        className="p-1 rounded transition-colors" style={{ color: '#475569' }}>
                        {copied ? <Check size={13} style={{ color: '#22c55e' }} /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>
                </div>
                {platform.helpUrl && (
                  <a href={platform.helpUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] mt-1.5 transition-colors"
                    style={{ color: '#475569' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = platform.color; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; }}>
                    <Info size={10} /> How to get a {platform.label} webhook URL
                  </a>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={isSaving || !config.url.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: isSaving || !config.url.trim() ? 'rgba(51,65,85,0.4)' : `${platform.color}cc`,
                    color: '#fff',
                    cursor: isSaving || !config.url.trim() ? 'not-allowed' : 'pointer',
                    opacity: isSaving || !config.url.trim() ? 0.5 : 1,
                  }}>
                  {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={handleTest} disabled={isTesting || !config.url.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: 'rgba(30,41,59,0.6)',
                    border: '1px solid rgba(51,65,85,0.5)',
                    color: isTesting || !config.url.trim() ? '#475569' : '#94a3b8',
                    cursor: isTesting || !config.url.trim() ? 'not-allowed' : 'pointer',
                  }}>
                  {isTesting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  {isTesting ? 'Sending…' : 'Send Test Ping'}
                </button>
              </div>

              {/* Test result badge */}
              <AnimatePresence>
                {testResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                    style={{
                      background: testResult.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      border: `1px solid ${testResult.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      color: testResult.ok ? '#22c55e' : '#ef4444',
                    }}>
                    {testResult.ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                    {testResult.msg}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* Event toggles */}
            <div className="rounded-xl p-5"
              style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(30,41,59,0.7)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#64748b' }}>
                Enabled Events
              </h3>
              <div className="space-y-2">
                {ALL_EVENTS.map((ev) => {
                  const active = config.enabled_events.includes(ev.id);
                  return (
                    <button key={ev.id} onClick={() => toggleEvent(ev.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                      style={{
                        background: active ? `${ev.color}0d` : 'rgba(30,41,59,0.3)',
                        border: `1px solid ${active ? ev.color + '30' : 'rgba(51,65,85,0.3)'}`,
                      }}>
                      <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{ background: active ? ev.color : 'rgba(51,65,85,0.5)', border: `1px solid ${active ? ev.color : 'rgba(51,65,85,0.5)'}` }}>
                        {active && <Check size={10} style={{ color: '#fff' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono" style={{ color: ev.color }}>{ev.id}</span>
                        </div>
                        <span className="text-[10px]" style={{ color: '#475569' }}>{ev.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Right: Preview ────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl overflow-hidden"
              style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(30,41,59,0.7)' }}>
              <button
                onClick={() => setShowPreview((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-3"
                style={{ borderBottom: showPreview ? '1px solid rgba(30,41,59,0.7)' : 'none' }}>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
                  Message Preview
                </span>
                {showPreview ? <ChevronUp size={14} style={{ color: '#475569' }} /> : <ChevronDown size={14} style={{ color: '#475569' }} />}
              </button>
              <AnimatePresence>
                {showPreview && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden">
                    <div className="p-4">
                      {config.type === 'slack'
                        ? <SlackPreview name={config.custom_name} />
                        : <DiscordPreview name={config.custom_name} />}
                      <p className="text-[10px] mt-3 text-center" style={{ color: '#334155' }}>
                        Live preview of message format
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Payload schema */}
            <div className="rounded-xl p-5"
              style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(30,41,59,0.7)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#64748b' }}>
                JSON Payload Schema
              </h3>
              <pre className="text-[10px] overflow-auto rounded-lg p-3 leading-relaxed"
                style={{ background: 'rgba(0,0,0,0.3)', color: '#94a3b8', maxHeight: 200, fontFamily: 'monospace' }}>
{`{
  "event": "request_created",
  "id": "REQ-042",
  "title": "Login not working",
  "priority": "critical",
  "category": "bug",
  "status": "submitted",
  "submitted_by": "dev-team",
  "timestamp": "2026-05-25T..."
}`}
              </pre>
            </div>

            {/* Tips */}
            <div className="rounded-xl p-4"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div className="flex items-start gap-2">
                <Zap size={13} style={{ color: '#f59e0b' }} className="mt-0.5 flex-shrink-0" />
                <div className="text-[10px] leading-relaxed" style={{ color: '#92400e' }}>
                  <p className="font-semibold mb-1" style={{ color: '#f59e0b' }}>Pro Tips</p>
                  <ul className="space-y-1">
                    <li>• Discord webhooks work out of the box — no bot required</li>
                    <li>• Slack: use Incoming Webhooks app (not OAuth)</li>
                    <li>• Custom endpoints receive raw JSON POST</li>
                    <li>• Test before saving to verify connectivity</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
