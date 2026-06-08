import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Camera,
  Send,
  Bug,
  Sparkles,
  Wrench,
  Palette,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  Crosshair,
  Paperclip,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Video,
  StopCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchRequests, createRequest, uploadAttachment } from '../lib/api';
import type { Priority, Category } from '../types';
import AISuggestPanel from './AISuggestPanel';

interface SubmitTabProps {
  onOpenCapture: () => void;
  onSwitchToRequests: (requestId?: string) => void;
}

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#3b82f6' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'critical', label: 'Critical', color: '#ef4444' },
];

const CATEGORIES: { value: Category; label: string; icon: React.ElementType }[] = [
  { value: 'bug', label: 'Bug', icon: Bug },
  { value: 'enhancement', label: 'Enhance', icon: Sparkles },
  { value: 'feature', label: 'Feature', icon: Wrench },
  { value: 'ui-ux', label: 'UI/UX', icon: Palette },
];

interface ConsoleEntry {
  level: string;
  message: string;
  timestamp: string;
}

async function captureScreenshot(): Promise<string> {
  try {
    const { toPng } = await import('html-to-image');
    // Hide the floating panel temporarily
    const panels = document.querySelectorAll('[data-dev-logs-panel]');
    const buttons = document.querySelectorAll('[data-dev-logs-button]');
    panels.forEach((el) => (el as HTMLElement).style.display = 'none');
    buttons.forEach((el) => (el as HTMLElement).style.display = 'none');
    await new Promise((r) => setTimeout(r, 100));

    const result = await toPng(document.body, {
      cacheBust: true,
      width: window.innerWidth,
      height: window.innerHeight,
      style: { transform: 'none' },
    });

    panels.forEach((el) => (el as HTMLElement).style.display = '');
    buttons.forEach((el) => (el as HTMLElement).style.display = '');
    return result;
  } catch {
    // Restore visibility on error
    document.querySelectorAll('[data-dev-logs-panel]').forEach((el) => (el as HTMLElement).style.display = '');
    document.querySelectorAll('[data-dev-logs-button]').forEach((el) => (el as HTMLElement).style.display = '');
    return '';
  }
}

async function uploadScreenshotBlob(
  requestId: string,
  dataUrl: string,
  filename: string,
): Promise<void> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], filename, { type: 'image/png' });
  await uploadAttachment(requestId, file);
}

export default function SubmitTab({ onOpenCapture, onSwitchToRequests }: SubmitTabProps) {
  const queryClient = useQueryClient();

  const [screenshotData, setScreenshotData] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [screenshotCollapsed, setScreenshotCollapsed] = useState(false);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<Category>('bug');
  const [files, setFiles] = useState<File[]>([]);
  const [draggingOver, setDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const [aiTitle, setAiTitle] = useState('');
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; scale: number; rotation: number; delay: number }[]>([]);

  useEffect(() => {
    if (submitted) {
      const colors = ['#22c55e', '#06b6d4', '#a855f7', '#eab308', '#ec4899'];
      const newParticles = Array.from({ length: 45 }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const velocity = 50 + Math.random() * 180;
        return {
          id: i,
          x: Math.cos(angle) * velocity,
          y: Math.sin(angle) * velocity - 20,
          color: colors[Math.floor(Math.random() * colors.length)],
          scale: 0.3 + Math.random() * 0.7,
          rotation: Math.random() * 360,
          delay: Math.random() * 0.2,
        };
      });
      setParticles(newParticles);
    } else {
      setParticles([]);
    }
  }, [submitted]);

  const handleRecordVideo = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        setIsRecording(false);
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `screen-record-${Date.now()}.webm`, { type: 'video/webm' });
        setFiles(prev => [...prev, file]);
        toast.success('Video attached to files');
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      toast.info('Screen recording started');
    } catch (err) {
      console.error(err);
      toast.error('Recording cancelled or failed');
    }
  };

  const consoleErrors = ((window as any).__consoleBuffer as ConsoleEntry[] | undefined || []).filter((e) => e.level === 'error').length;
  const consoleWarnings = ((window as any).__consoleBuffer as ConsoleEntry[] | undefined || []).filter((e) => e.level === 'warn').length;
  const pageUrl = window.location.pathname;

  const { data: requests = [] } = useQuery({
    queryKey: ['requests'],
    queryFn: () => fetchRequests(),
  });

  const similarRequests = React.useMemo(() => {
    if (description.trim().length < 15) return [];
    const words = description.toLowerCase().split(/\W+/).filter(w => w.length > 4);
    if (words.length === 0) return [];

    return requests
      .filter((req) => req.status !== 'completed' && req.status !== 'cancelled')
      .map((req) => {
        const text = (req.title + ' ' + req.description).toLowerCase();
        let matches = 0;
        words.forEach(w => { if (text.includes(w)) matches++; });
        return { req, score: matches / words.length };
      })
      .filter((x) => x.score >= 0.4)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(x => x.req);
  }, [description, requests]);

  const handleCapture = useCallback(async () => {
    setCapturing(true);
    const data = await captureScreenshot();
    setScreenshotData(data);
    setCapturing(false);
    if (data) toast.success('Screenshot captured');
    else toast.error('Failed to capture screenshot');
  }, []);

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Please describe the issue');
      return;
    }

    setSubmitting(true);
    try {
      const consoleLogs = ((window as any).__consoleBuffer as ConsoleEntry[] || []).slice(-50);
      const networkLogs = ((window as any).__networkBuffer as any[] || []).slice(-20);

      // Use AI-suggested title if available, else auto-generate from description
      const autoTitle = aiTitle.trim() || description.trim().split('\n')[0].slice(0, 80) || 'New request';

      const contextBlock = [
        description.trim(),
        '',
        `---`,
        `**Page**: \`${pageUrl}\`  |  **Viewport**: ${window.innerWidth}x${window.innerHeight}`,
        `**Browser**: ${navigator.userAgent.slice(0, 100)}`,
        `**Timestamp**: ${new Date().toISOString()}`,
        consoleErrors > 0 ? `**Console Errors**: ${consoleErrors}` : '',
        consoleWarnings > 0 ? `**Console Warnings**: ${consoleWarnings}` : '',
        consoleLogs.length > 0
          ? `\n**Console Logs**:\n\`\`\`\n${consoleLogs.map((l) => `[${l.level}] ${l.message}`).join('\n')}\n\`\`\``
          : '',
        networkLogs.length > 0
          ? `\n**Network Requests**:\n\`\`\`\n${networkLogs.map((n) => `[${n.method}] ${n.url} - ${n.status || 'FAIL'} (${n.duration || '?'}ms)`).join('\n')}\n\`\`\``
          : '',
      ].filter(Boolean).join('\n');

      const body = {
        title: autoTitle,
        description: contextBlock,
        priority,
        category: (category === 'ui-ux' ? 'ui' : category) as Category,
        submitted_by: localStorage.getItem('devLogs_author') || 'dev-team',
        platform: window.location.hostname,
        tags,
      };

      const result = await createRequest(body);
      const requestId = result?.id;

      // Upload screenshot if available
      if (screenshotData && requestId) {
        try {
          await uploadScreenshotBlob(requestId, screenshotData, `dev-capture-${Date.now()}.png`);
        } catch { /* ignore */ }
      }

      // Upload attached files
      if (files.length > 0 && requestId) {
        for (const file of files) {
          try {
            await uploadAttachment(requestId, file);
          } catch { /* ignore */ }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['requests'] });
      setSubmitted(true);
      setSubmittedId(requestId || null);
      toast.success(`Request ${requestId || ''} created`);
    } catch (err) {
      console.error('Submit failed:', err);
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setSubmittedId(null);
    setDescription('');
    setScreenshotData('');
    setFiles([]);
    setPriority('medium');
    setCategory('bug');
    setTags([]);
    setTagInput('');
    setAiTitle('');
  };

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/^#+/, '');
    if (t && !tags.includes(t) && tags.length < 8) setTags((prev) => [...prev, t]);
    setTagInput('');
  };

  const handleAIApply = (opts: { title?: string; priority?: string; category?: string; tags?: string[] }) => {
    if (opts.title) setAiTitle(opts.title);
    if (opts.priority) setPriority(opts.priority as Priority);
    if (opts.category) {
      const cat = opts.category === 'ui-ux' || opts.category === 'ui' ? 'ui-ux' : opts.category;
      setCategory(cat as Category);
    }
    if (opts.tags) {
      opts.tags.forEach((t) => {
        setTags((prev) => prev.includes(t) ? prev : [...prev, t].slice(0, 8));
      });
    }
    toast.success('AI suggestions applied!');
  };

  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  const handleFileSelect = (newFiles: FileList | null) => {
    if (!newFiles) return;
    setFiles(prev => [...prev, ...Array.from(newFiles)]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return ImageIcon;
    if (file.type.startsWith('video/')) return Video;
    if (file.type.startsWith('text/') || file.name.endsWith('.log') || file.name.endsWith('.json') || file.name.endsWith('.csv')) return FileText;
    return FileIcon;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 p-6 text-center relative overflow-hidden bg-slate-950/20 rounded-xl">
        {/* Confetti particles */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
              animate={{
                x: p.x,
                y: [0, p.y * 0.6, p.y, p.y + 120],
                scale: [0, p.scale, p.scale, 0],
                opacity: [1, 1, 0.8, 0],
                rotate: p.rotation * 3,
              }}
              transition={{
                duration: 1.5 + Math.random() * 1.0,
                ease: "easeOut",
                delay: p.delay,
              }}
              className="absolute w-3.5 h-3.5"
              style={{
                backgroundColor: p.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              }}
            />
          ))}
        </div>

        {/* Pulsing checkmark badge */}
        <div className="relative my-2">
          {/* Pulsing outer rings */}
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="absolute -inset-4 rounded-full border border-emerald-500/20 pointer-events-none"
          />
          <motion.div
            animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.25 }}
            className="absolute -inset-2 rounded-full border border-emerald-400/30 pointer-events-none"
          />

          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 120 }}
            className="w-16 h-16 rounded-full flex items-center justify-center relative z-10"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.05) 100%)',
              border: '1px solid rgba(16,185,129,0.4)',
              boxShadow: '0 0 15px rgba(16,185,129,0.2), inset 0 0 10px rgba(16,185,129,0.1)',
            }}
          >
            <CheckCircle2 size={32} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
          </motion.div>
        </div>

        {/* Text Block */}
        <div className="space-y-2 z-10">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-base font-bold bg-gradient-to-r from-emerald-400 via-green-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm select-none"
          >
            Request Submitted! 🎉
          </motion.h2>

          {submittedId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45 }}
              className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-mono font-semibold"
              style={{
                background: 'rgba(15,23,42,0.6)',
                border: '1px solid rgba(51,65,85,0.6)',
                color: '#94a3b8',
              }}
            >
              <span className="text-cyan-400 select-none">ID:</span>
              <motion.span
                animate={{ color: ['#22d3ee', '#34d399', '#22d3ee'] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                #{submittedId}
              </motion.span>
            </motion.div>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 0.6 }}
            className="text-[11px] text-slate-400 max-w-[240px] mx-auto mt-1 leading-normal"
          >
            Logs and screenshot diagnostics successfully uploaded. AI has routed your request to the backlog.
          </motion.p>
        </div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex gap-2.5 mt-2 z-10 w-full max-w-[250px]"
        >
          {submittedId && (
            <button
              onClick={() => onSwitchToRequests(submittedId)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all relative overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(8,145,178,0.08) 100%)',
                color: '#22d3ee',
                border: '1px solid rgba(6,182,212,0.4)',
                boxShadow: '0 0 8px rgba(6,182,212,0.08)',
              }}
            >
              <div className="absolute inset-0 bg-cyan-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative">View Request</span>
            </button>
          )}
          <button
            onClick={handleReset}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all relative overflow-hidden group"
            style={{
              background: 'rgba(30,41,59,0.5)',
              color: '#94a3b8',
              border: '1px solid rgba(51,65,85,0.6)',
            }}
          >
            <div className="absolute inset-0 bg-slate-800/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative">New Request</span>
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: 0 }}>
        {/* Context badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-md font-mono" style={{ color: '#64748b', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(51,65,85,0.3)' }}>
            {pageUrl}
          </span>
          {consoleErrors > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1" style={{ color: '#ef4444', background: 'rgba(127,29,29,0.25)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <AlertTriangle size={8} /> {consoleErrors} err
            </span>
          )}
          {consoleWarnings > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-md" style={{ color: '#f59e0b', background: 'rgba(120,53,15,0.25)', border: '1px solid rgba(245,158,11,0.25)' }}>
              {consoleWarnings} warn
            </span>
          )}
        </div>

        {/* Capture tools */}
        <div className="flex gap-1.5">
          <button
            onClick={handleCapture}
            disabled={capturing}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: screenshotData ? 'rgba(34,197,94,0.08)' : 'rgba(15,23,42,0.7)',
              border: `1px solid ${screenshotData ? 'rgba(34,197,94,0.25)' : 'rgba(51,65,85,0.5)'}`,
              color: screenshotData ? '#22c55e' : '#94a3b8',
              cursor: capturing ? 'wait' : 'pointer',
            }}
          >
            {capturing ? (
              <><Loader2 size={13} className="animate-spin" /> Capturing...</>
            ) : screenshotData ? (
              <><Camera size={13} /> Re-capture</>
            ) : (
              <><Camera size={13} /> Screenshot</>
            )}
          </button>

          <button
            onClick={handleRecordVideo}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: isRecording ? 'rgba(239,68,68,0.1)' : 'rgba(15,23,42,0.7)',
              border: `1px solid ${isRecording ? 'rgba(239,68,68,0.3)' : 'rgba(51,65,85,0.5)'}`,
              color: isRecording ? '#ef4444' : '#94a3b8',
            }}
          >
            {isRecording ? (
              <><StopCircle size={13} className="animate-pulse" /> Stop Rec</>
            ) : (
              <><Video size={13} /> Record</>
            )}
          </button>

          <button
            onClick={onOpenCapture}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: 'rgba(15,23,42,0.7)',
              border: '1px solid rgba(51,65,85,0.5)',
              color: '#94a3b8',
            }}
            title="Advanced capture: element picker, snip area, annotate"
          >
            <Crosshair size={13} /> Advanced
          </button>
        </div>

        {/* Screenshot preview */}
        {screenshotData && (
          <div className="flex flex-col gap-0">
            <button
              onClick={() => setScreenshotCollapsed(!screenshotCollapsed)}
              className="flex items-center justify-between w-full px-3 py-1.5 text-[11px] font-medium"
              style={{
                background: 'rgba(15,23,42,0.6)',
                border: '1px solid rgba(51,65,85,0.4)',
                borderRadius: screenshotCollapsed ? 8 : '8px 8px 0 0',
                color: '#94a3b8',
              }}
            >
              <div className="flex items-center gap-1.5">
                <Camera size={10} color="#22d3ee" />
                <span>Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setScreenshotData(''); }}
                  className="hover:text-red-400 transition-colors"
                >
                  <X size={10} />
                </button>
                {screenshotCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
              </div>
            </button>
            {!screenshotCollapsed && (
              <div style={{ borderRadius: '0 0 8px 8px', overflow: 'hidden', border: '1px solid rgba(51,65,85,0.4)', borderTop: 'none', maxHeight: 140 }}>
                <img src={screenshotData} alt="Screenshot" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 140, objectFit: 'cover', objectPosition: 'top' }} />
              </div>
            )}
          </div>
        )}

        {/* File attachments */}
        <div>
          <label className="text-[11px] font-medium mb-1.5 block" style={{ color: '#94a3b8' }}>
            Attachments {files.length > 0 && `(${files.length})`}
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDraggingOver(true); }}
            onDragLeave={() => setDraggingOver(false)}
            onDrop={(e) => { e.preventDefault(); setDraggingOver(false); handleFileSelect(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-[11px] font-medium cursor-pointer transition-all"
            style={{
              background: draggingOver ? 'rgba(6,182,212,0.08)' : 'rgba(15,23,42,0.5)',
              border: `1.5px dashed ${draggingOver ? 'rgba(6,182,212,0.5)' : 'rgba(51,65,85,0.4)'}`,
              color: draggingOver ? '#22d3ee' : '#64748b',
            }}
          >
            <Paperclip size={12} />
            <span>Drop files here or click to browse</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => { handleFileSelect(e.target.files); e.target.value = ''; }}
          />
          {files.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {files.map((file, i) => {
                const Icon = getFileIcon(file);
                const isImage = file.type.startsWith('image/');
                return (
                  <div
                    key={`${file.name}-${i}`}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] group"
                    style={{
                      background: 'rgba(15,23,42,0.7)',
                      border: '1px solid rgba(51,65,85,0.4)',
                      color: '#94a3b8',
                      maxWidth: '100%',
                    }}
                  >
                    {isImage ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-5 h-5 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <Icon size={12} className="flex-shrink-0" style={{ color: '#64748b' }} />
                    )}
                    <span className="truncate" style={{ maxWidth: 120 }}>{file.name}</span>
                    <span style={{ color: '#475569' }}>{formatFileSize(file.size)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="ml-0.5 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="text-[11px] font-medium mb-1.5 block" style={{ color: '#94a3b8' }}>What needs to be done? *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the bug, improvement, or feature request in plain text..."
            rows={5}
            className="w-full px-3 py-2 rounded-lg text-[13px] outline-none transition-all resize-none font-[inherit]"
            style={{
              background: 'rgba(15,23,42,0.7)',
              border: '1px solid rgba(51,65,85,0.5)',
              color: '#e2e8f0',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.5)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(51,65,85,0.5)'; }}
          />

          {/* AI Triage Panel — appears after 15 chars */}
          <AISuggestPanel
            description={description}
            consoleErrors={consoleErrors}
            onApply={handleAIApply}
            onViewRequest={(id) => onSwitchToRequests(id)}
          />
        </div>

        {/* Priority */}
        <div>
          <label className="text-[11px] font-medium mb-1.5 block" style={{ color: '#94a3b8' }}>Priority</label>
          <div className="flex gap-1.5">
            {PRIORITIES.map((p) => {
              const isActive = priority === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                  style={{
                    background: isActive ? `${p.color}18` : 'rgba(15,23,42,0.5)',
                    border: `1.5px solid ${isActive ? `${p.color}80` : 'rgba(51,65,85,0.4)'}`,
                    color: isActive ? p.color : '#64748b',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-[11px] font-medium mb-1.5 block" style={{ color: '#94a3b8' }}>Category</label>
          <div className="flex gap-1.5">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const isActive = category === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition-all"
                  style={{
                    background: isActive ? 'rgba(6,182,212,0.1)' : 'rgba(15,23,42,0.5)',
                    border: `1.5px solid ${isActive ? 'rgba(6,182,212,0.45)' : 'rgba(51,65,85,0.4)'}`,
                    color: isActive ? '#22d3ee' : '#64748b',
                  }}
                >
                  <Icon size={11} /> {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="text-[11px] font-medium mb-1.5 block" style={{ color: '#94a3b8' }}>
            Tags <span style={{ color: '#475569' }}>(press Enter to add)</span>
          </label>
          <div
            className="flex flex-wrap gap-1.5 p-2 rounded-lg min-h-[32px] items-center"
            style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.5)' }}
          >
            {tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', color: '#22d3ee' }}
              >
                #{t}
                <button
                  onClick={() => removeTag(t)}
                  className="hover:text-red-400 transition-colors"
                  type="button"
                >
                  <X size={8} />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
                if (e.key === 'Backspace' && !tagInput && tags.length > 0) removeTag(tags[tags.length - 1]);
              }}
              placeholder={tags.length === 0 ? 'auth, mobile, perf…' : ''}
              className="flex-1 min-w-[80px] bg-transparent outline-none text-[11px]"
              style={{ color: '#e2e8f0' }}
            />
          </div>
        </div>

        {/* Deduplication warning */}
        {similarRequests.length > 0 && (
          <div className="p-2.5 rounded-lg mb-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-yellow-500 mb-1">
              <AlertTriangle size={12} /> Possible Duplicates Found
            </div>
            <ul className="space-y-1">
              {similarRequests.map(r => (
                <li key={r.id} className="text-[10px] truncate" style={{ color: '#d97706' }}>
                  <button onClick={() => onSwitchToRequests(r.id)} className="hover:underline text-left">
                    {r.id}: {r.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Submit footer */}
      <div
        className="flex-shrink-0 p-3"
        style={{
          borderTop: '1px solid rgba(6,182,212,0.08)',
          background: 'linear-gradient(180deg, transparent, rgba(6,182,212,0.02))',
        }}
      >
        <button
          onClick={handleSubmit}
          disabled={submitting || !description.trim()}
          className="w-full py-2.5 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 transition-all"
          style={{
            background: submitting || !description.trim()
              ? 'rgba(51,65,85,0.4)'
              : 'linear-gradient(135deg, #0891b2, #06b6d4, #22d3ee)',
            color: submitting || !description.trim() ? '#64748b' : '#ffffff',
            border: 'none',
            cursor: submitting || !description.trim() ? 'not-allowed' : 'pointer',
            opacity: submitting || !description.trim() ? 0.6 : 1,
            boxShadow: submitting || !description.trim() ? 'none' : '0 4px 16px rgba(6,182,212,0.25)',
          }}
        >
          {submitting ? (
            <><Loader2 size={14} className="animate-spin" /> Submitting...</>
          ) : (
            <><Send size={13} /> Submit to Dev Logs</>
          )}
        </button>
      </div>
    </div>
  );
}
