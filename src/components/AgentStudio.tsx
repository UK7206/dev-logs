import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BrainCircuit, Sparkles, Send, Bot, User, Key, Save, AlertCircle,
  CheckCircle2, Folder, FileText, ChevronRight, ChevronDown, Check,
  X, RefreshCw, Code2, Terminal, Play, ClipboardCheck, ArrowRight,
  Search, ShieldAlert, Cpu, History, Undo2
} from 'lucide-react';
import { fetchRequests } from '../lib/api';
import type { DevRequest } from '../types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface FileItem {
  name: string;
  isDirectory: boolean;
  path: string;
}

interface ParsedPatch {
  filePath: string;
  code: string;
}

export default function AgentStudio() {
  // State for active ticket and chat
  const [selectedReqId, setSelectedReqId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `👋 Hello! I am your **AI Workspace Agent**. I run locally inside your development workspace.

I have full visibility into your project directory and your active bug/feature tickets.

**To get started:**
1. Select an **Active Ticket** from the left panel to load its screenshots, logs, and context.
2. Browse your local files below it and **check files** to attach them directly to my memory.
3. Chat with me! Ask me to *"Analyze this bug"*, *"Explain this file"*, or *"Suggest a code patch"* to fix it.

*Note: Paste your **Gemini API Key** in the settings button above to unlock live, real-world AI reasoning!*`
    }
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  // Settings & Keys state
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [showKeyPanel, setShowKeyPanel] = useState<boolean>(false);
  const [isSavingKey, setIsSavingKey] = useState<boolean>(false);

  // File tree state
  const [treeLoaded, setTreeLoaded] = useState<boolean>(false);
  const [dirContents, setDirContents] = useState<Record<string, FileItem[]>>({});
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [workspaceRoot, setWorkspaceRoot] = useState<string>('');
  const [fileSearchQuery, setFileSearchQuery] = useState<string>('');

  // Diagnostic Terminal State
  const [command, setCommand] = useState<string>('npm run build');
  const [terminalOutput, setTerminalOutput] = useState<string>('System diagnostic terminal idle.\nReady to run build/verification commands...');
  const [isCmdRunning, setIsCmdRunning] = useState<boolean>(false);

  // Backups state
  const [backups, setBackups] = useState<any[]>([]);

  const fetchBackups = async () => {
    try {
      const res = await fetch('/api/system/backups');
      const data = await res.json();
      if (data.status === 'success') {
        setBackups(data.history || []);
      }
    } catch {}
  };

  const handleRollback = async (backupId: string) => {
    try {
      const res = await fetch('/api/system/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: backupId })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Successfully restored previous version!');
        fetchBackups();
      } else {
        toast.error(`Rollback failed: ${data.detail}`);
      }
    } catch {
      toast.error('Failed to trigger restore');
    }
  };

  // Active chat thread scroll ref
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Queries for tickets list
  const { data: tickets = [] } = useQuery({
    queryKey: ['agent-tickets'],
    queryFn: () => fetchRequests(),
  });

  const selectedTicket = tickets.find((t) => t.id === selectedReqId);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load settings, root files & backups on mount
  useEffect(() => {
    // 1. Fetch Gemini Key from settings
    fetch('/api/system/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings?.gemini_api_key) {
          setGeminiKey(data.settings.gemini_api_key);
        }
      })
      .catch(() => {});

    // 2. Fetch root directory contents
    loadDirectoryContent('');

    // 3. Fetch backups history
    fetchBackups();
  }, []);

  // Directory loading helper
  const loadDirectoryContent = async (dirPath: string) => {
    try {
      const url = `/api/system/ls${dirPath ? `?dir=${encodeURIComponent(dirPath)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'success') {
        const currentDir = data.currentDir;
        if (!workspaceRoot) {
          setWorkspaceRoot(currentDir);
        }
        setDirContents((prev) => ({
          ...prev,
          [currentDir]: data.files || []
        }));
        setTreeLoaded(true);
      }
    } catch (e) {
      toast.error('Failed to load project file tree');
    }
  };

  // Toggle folders in explorer tree
  const toggleFolder = async (folderPath: string) => {
    const isExpanded = !!expandedDirs[folderPath];
    setExpandedDirs((prev) => ({
      ...prev,
      [folderPath]: !isExpanded
    }));

    if (!isExpanded && !dirContents[folderPath]) {
      await loadDirectoryContent(folderPath);
    }
  };

  // Toggle file context attachment
  const toggleFileAttachment = (filePath: string) => {
    setAttachedFiles((prev) =>
      prev.includes(filePath) ? prev.filter((p) => p !== filePath) : [...prev, filePath]
    );
  };

  // Handle saving API keys
  const saveApiKey = async () => {
    setIsSavingKey(true);
    try {
      const res = await fetch('/api/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gemini_api_key: geminiKey })
      });
      if (res.ok) {
        toast.success('Gemini API key saved locally!');
        setShowKeyPanel(false);
      } else {
        toast.error('Failed to save API key');
      }
    } catch {
      toast.error('API Error connecting to server');
    } finally {
      setIsSavingKey(false);
    }
  };

  // Run Workspace Diagnostics / Builds
  const runDiagnosticCommand = async () => {
    if (!command.trim()) return;
    setIsCmdRunning(true);
    setTerminalOutput(`$ ${command}\nRunning command on local workspace...\n`);
    try {
      const res = await fetch('/api/system/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, cwd: workspaceRoot })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setTerminalOutput(`$ ${command}\n\n${data.stdout || ''}\n${data.stderr || ''}\n\nCommand exited successfully.`);
        toast.success('Command executed successfully');
      } else {
        setTerminalOutput(`$ ${command}\n\n[ERROR] Command failed with status 500:\n${data.detail || ''}\n\n${data.stdout || ''}\n${data.stderr || ''}`);
        toast.error('Command exited with errors');
      }
    } catch (err: any) {
      setTerminalOutput(`$ ${command}\n\n[EXECUTION ERROR] ${err.message}`);
      toast.error('Failed to execute command');
    } finally {
      setIsCmdRunning(false);
    }
  };

  // Handle sending chat messages
  const handleSendMessage = async (text: string = inputValue) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const newMessages = [...messages, { role: 'user', content: trimmed } as Message];
    setMessages(newMessages);
    setInputValue('');
    setIsSending(true);

    try {
      const res = await fetch('/api/ai/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          request_context: selectedTicket ? {
            id: selectedTicket.id,
            title: selectedTicket.title,
            description: selectedTicket.description,
            category: selectedTicket.category,
            priority: selectedTicket.priority,
            status: selectedTicket.status
          } : null,
          attached_files: attachedFiles
        })
      });

      const data = await res.json();
      if (data.status === 'success' && data.message) {
        setMessages((prev) => [...prev, data.message]);
      } else {
        toast.error('Failed to get AI agent response');
      }
    } catch {
      toast.error('Network error connecting to AI agent');
    } finally {
      setIsSending(false);
    }
  };

  // Apply suggested code patch directly to local workspace!
  const applyCodePatch = async (patch: ParsedPatch) => {
    try {
      const res = await fetch('/api/system/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: patch.filePath,
          content: patch.code
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success(`Successfully patched file: ${patch.filePath.split(/[\\/]/).pop()}!`);
        fetchBackups(); // Refresh backups listing!
      } else {
        toast.error(`Patch failed: ${data.detail || 'Access restricted'}`);
      }
    } catch (e: any) {
      toast.error(`Write Error: ${e.message}`);
    }
  };

  // Parse last assistant message to find any recommended patches
  const parseLatestPatch = (): ParsedPatch | null => {
    const assistantMessages = messages.filter((m) => m.role === 'assistant');
    if (assistantMessages.length === 0) return null;
    const lastMsg = assistantMessages[assistantMessages.length - 1].content;

    // Scan for [PATCH: path/to/file] followed by markdown code block
    const patchRegex = /\[PATCH:\s*([^\]\s]+)\]\s*\n*```[a-zA-Z0-9]*\n([\s\S]*?)```/i;
    const match = lastMsg.match(patchRegex);
    if (match) {
      return {
        filePath: match[1].trim(),
        code: match[2]
      };
    }
    return null;
  };

  const activePatch = parseLatestPatch();

  // Recursive renderer for directory tree
  const renderDirTree = (dirPath: string, depth = 0) => {
    const items = dirContents[dirPath] || [];
    if (items.length === 0) return null;

    // Filter out node_modules, dist, .git, etc. to keep tree clean
    const filtered = items.filter(
      (item) => !['node_modules', 'dist', '.git', 'overlay'].includes(item.name)
    );

    return (
      <div className="space-y-0.5 select-none">
        {filtered.map((item) => {
          const isDir = item.isDirectory;
          const isExpanded = !!expandedDirs[item.path];
          const isAttached = attachedFiles.includes(item.path);

          if (isDir) {
            return (
              <div key={item.path}>
                <button
                  onClick={() => toggleFolder(item.path)}
                  className="w-full flex items-center gap-1.5 py-1 px-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/40 rounded transition-colors text-left font-mono"
                  style={{ paddingLeft: `${8 + depth * 12}px` }}
                >
                  {isExpanded ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />}
                  <Folder size={12} className="text-amber-500 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </button>
                {isExpanded && renderDirTree(item.path, depth + 1)}
              </div>
            );
          } else {
            return (
              <button
                key={item.path}
                onClick={() => toggleFileAttachment(item.path)}
                className={`w-full flex items-center gap-2 py-1 px-2 text-xs text-left font-mono rounded transition-all ${
                  isAttached
                    ? 'bg-purple-900/25 border-l border-purple-500 text-purple-200'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
                }`}
                style={{ paddingLeft: `${24 + depth * 12}px` }}
              >
                <div
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition-all ${
                    isAttached ? 'bg-purple-600 border-purple-500' : 'border-gray-700 bg-gray-900'
                  }`}
                >
                  {isAttached && <Check size={8} className="text-white font-bold" />}
                </div>
                <FileText size={12} className={isAttached ? 'text-purple-400 shrink-0' : 'text-gray-500 shrink-0'} />
                <span className="truncate flex-1">{item.name}</span>
              </button>
            );
          }
        })}
      </div>
    );
  };

  return (
    <div className="flex h-full text-gray-200 overflow-hidden font-sans">
      {/* ── LEFT COLUMN: Ticket & Workspace Explorer ────────────────────────── */}
      <div className="w-80 border-r border-gray-800 bg-gray-950 flex flex-col shrink-0">
        {/* Ticket Context Selector */}
        <div className="p-4 border-b border-gray-800 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Active Ticket Context
            </h3>
            {selectedReqId && (
              <button
                onClick={() => setSelectedReqId('')}
                className="text-[10px] text-red-400 hover:text-red-300"
              >
                Clear
              </button>
            )}
          </div>

          <select
            value={selectedReqId}
            onChange={(e) => {
              setSelectedReqId(e.target.value);
              if (e.target.value) {
                const target = tickets.find((t) => t.id === e.target.value);
                if (target) {
                  toast.success(`Attached ticket ${target.id} context!`);
                }
              }
            }}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-200 outline-none focus:border-purple-500 transition-colors"
          >
            <option value="">-- Select Active Bug Ticket --</option>
            {tickets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id}: {t.title.slice(0, 32)}... ({t.priority})
              </option>
            ))}
          </select>

          {selectedTicket && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-lg space-y-1.5"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-purple-400">
                <span>{selectedTicket.id}</span>
                <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20">
                  {selectedTicket.priority}
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-200 truncate">{selectedTicket.title}</p>
              <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
                {selectedTicket.description.split('\n---')[0]}
              </p>
            </motion.div>
          )}
        </div>

        {/* Live File Explorer Header */}
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between shrink-0 bg-gray-900/30">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Workspace Source Files
          </span>
          <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-full">
            {attachedFiles.length} attached
          </span>
        </div>

        {/* Live File Explorer Tree */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {treeLoaded ? (
            renderDirTree(workspaceRoot)
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <RefreshCw className="w-5 h-5 text-gray-600 animate-spin" />
              <span className="text-xs text-gray-500">Loading directory tree...</span>
            </div>
          )}
        </div>
      </div>

      {/* ── CENTER COLUMN: Interactive Chat Workspace ──────────────────────── */}
      <div className="flex-1 flex flex-col bg-gray-950 relative overflow-hidden">
        {/* Header navigation & API key configurations */}
        <div className="bg-gray-900/50 border-b border-gray-800 p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                AI Workspace Agent
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold uppercase tracking-wider">
                  Live
                </span>
              </h2>
              <p className="text-[10px] text-gray-500">Locally sandboxed developer copilot</p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowKeyPanel(!showKeyPanel)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                geminiKey
                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/20 hover:bg-purple-500/20'
                  : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Key size={12} className={geminiKey ? 'text-purple-400' : 'text-gray-500'} />
              {geminiKey ? 'API Key Configured' : 'Configure API Key'}
            </button>

            {/* Slide Down Key Panel */}
            <AnimatePresence>
              {showKeyPanel && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-72 bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-2xl z-[9999] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Gemini API Key Settings</span>
                    <button
                      onClick={() => setShowKeyPanel(false)}
                      className="text-gray-500 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Insert your Gemini API key below to enable real reasoning over your files. Stored safely in local settings.
                  </p>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-purple-500 transition-colors"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveApiKey}
                      disabled={isSavingKey}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-all"
                    >
                      {isSavingKey ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                      Save Key
                    </button>
                    {geminiKey && (
                      <button
                        onClick={async () => {
                          setGeminiKey('');
                          await fetch('/api/system/settings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ gemini_api_key: '' })
                          });
                          toast.success('API Key deleted successfully');
                        }}
                        className="py-1.5 px-2 bg-red-950/20 hover:bg-red-900/30 text-red-400 rounded-lg text-xs font-medium border border-red-500/20"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Chat Timeline */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => {
            const isAgent = m.role === 'assistant';
            return (
              <div
                key={i}
                className={`flex gap-3 max-w-[85%] ${isAgent ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                <div
                  className={`w-7.5 h-7.5 rounded-full flex items-center justify-center shrink-0 text-white border shadow-md ${
                    isAgent
                      ? 'bg-purple-900/40 border-purple-500/30'
                      : 'bg-emerald-950/40 border-emerald-500/30'
                  }`}
                  style={{ width: 30, height: 30 }}
                >
                  {isAgent ? <Bot size={14} className="text-purple-400" /> : <User size={14} className="text-emerald-400" />}
                </div>

                <div
                  className={`rounded-2xl px-4 py-3 leading-relaxed text-sm ${
                    isAgent
                      ? 'bg-gray-900/70 border border-gray-800 text-gray-200 rounded-tl-none'
                      : 'bg-purple-600 text-white rounded-tr-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap select-text font-sans">
                    {/* Clean formatted text without the raw PATCH code metadata block */}
                    {isAgent ? m.content.replace(/\[PATCH:[\s\S]*?```[\s\S]*?```/gi, '💡 *Suggested patch generated! Check the Patch Studio on the right side.*') : m.content}
                  </div>
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex gap-3 mr-auto items-center">
              <div
                className="w-7.5 h-7.5 rounded-full flex items-center justify-center bg-gray-900 border border-gray-800"
                style={{ width: 30, height: 30 }}
              >
                <Bot size={14} className="text-purple-400" />
              </div>
              <div className="bg-gray-900/40 border border-gray-800 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-gray-400 flex items-center gap-2">
                <RefreshCw size={12} className="animate-spin text-purple-400" />
                AI Agent compiling workspace context and thinking...
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Prompt Helper Chips */}
        <div className="px-6 py-2 flex gap-2 overflow-x-auto shrink-0 select-none no-scrollbar">
          {[
            { label: '🔍 Diagnose Ticket Bug', prompt: 'Please read the selected ticket details, screenshots, and logs, inspect the attached code files, and diagnose the root cause of this bug.' },
            { label: '🩹 Suggest Code Patch', prompt: 'Based on the active ticket bug description, please write a direct code patch inside a `[PATCH: relative_path]` block to solve the problem.' },
            { label: '🧪 Generate Unit Tests', prompt: 'Could you write robust unit tests for the attached code files?' },
            { label: '⚡ Optimize Performance', prompt: 'Can you analyze the attached source files and suggest optimizations for speed, memory usage, or layout performance?' }
          ].map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleSendMessage(chip.prompt)}
              className="px-3 py-1 bg-gray-900 border border-gray-800 hover:border-purple-500 hover:bg-purple-950/20 text-gray-400 hover:text-purple-300 rounded-lg text-xs font-medium transition-all shrink-0"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-gray-800 bg-gray-950 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2.5 items-center"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                selectedReqId
                  ? `Message AI Agent about ticket ${selectedReqId}...`
                  : 'Message AI Agent (select a ticket context to start)...'
              }
              className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-purple-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isSending}
              className="w-10.5 h-10.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 shadow-lg transition-all"
              style={{ width: 42, height: 42 }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>

      {/* ── RIGHT COLUMN: Patch Studio & Diagnostic Console ────────────────── */}
      <div className="w-96 border-l border-gray-800 bg-gray-950 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
        {/* Workspace Code Patch Studio */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Code2 size={14} className="text-purple-400" />
            AI Code Patching Studio
          </h3>

          <AnimatePresence mode="wait">
            {activePatch ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-gray-900 border border-purple-500/20 rounded-xl overflow-hidden shadow-xl"
              >
                {/* File Header */}
                <div className="bg-purple-950/20 border-b border-purple-500/20 px-3.5 py-2.5 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase font-bold text-purple-400 font-mono tracking-wider">
                      Target File
                    </p>
                    <p className="text-xs font-mono font-semibold text-gray-200 truncate">
                      {activePatch.filePath}
                    </p>
                  </div>
                  <ClipboardCheck size={14} className="text-purple-400 shrink-0" />
                </div>

                {/* Code Preview */}
                <div className="p-3 bg-gray-950/90 font-mono text-[10px] leading-relaxed overflow-x-auto max-h-64 border-b border-gray-800">
                  <pre className="text-gray-300">{activePatch.code.slice(0, 1000)}{activePatch.code.length > 1000 ? '\n... (truncated for preview)' : ''}</pre>
                </div>

                {/* Apply Actions */}
                <div className="p-3 bg-gray-900 flex flex-col gap-2">
                  <button
                    onClick={() => applyCodePatch(activePatch)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-lg transition-all"
                  >
                    <Sparkles size={12} />
                    Apply Patch to Workspace
                  </button>
                  <p className="text-[9px] text-center text-gray-500">
                    Will overwrite the targeted local file directly in your folder path.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 text-center bg-gray-900/40 border border-gray-800 rounded-xl border-dashed"
              >
                <Cpu size={24} className="text-gray-700 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-400">No suggestions yet</p>
                <p className="text-[10px] text-gray-600 mt-1 max-w-[200px] mx-auto leading-normal">
                  Ask me to "Suggest code patch" inside the chat workspace to generate a patch.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Patch Backup History / Rollback Studio */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3.5 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
              <History size={13} className="text-purple-400" />
              Restore & Rollback History
            </div>
            <span className="text-[10px] text-gray-500 font-mono">({backups.length})</span>
          </div>

          {backups.length === 0 ? (
            <p className="text-[10px] text-gray-500 italic">No patches in current session history.</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {backups.map((bak) => (
                <div key={bak.id} className="flex items-center justify-between p-2 bg-gray-950/60 rounded border border-gray-800 text-[10px] font-mono">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-gray-300 truncate" title={bak.relativePath}>{bak.relativePath}</p>
                    <p className="text-[9px] text-gray-500 mt-0.5">
                      {new Date(bak.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRollback(bak.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 transition-all font-semibold select-none text-[9px]"
                    title="Rollback this patch"
                  >
                    <Undo2 size={9} />
                    Undo
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Retro Terminal Diagnostic Console */}
        <div className="space-y-3 flex-1 flex flex-col min-h-[300px]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Terminal size={14} className="text-emerald-400" />
            Diagnostic Console
          </h3>

          <div className="flex-1 flex flex-col bg-black border border-gray-800 rounded-xl overflow-hidden font-mono shadow-2xl">
            {/* Terminal Top bar */}
            <div className="bg-gray-900 border-b border-gray-800 px-3.5 py-2 flex items-center justify-between shrink-0">
              <span className="text-[10px] text-gray-400">root@dev-logs:~</span>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
              </div>
            </div>

            {/* Virtual Screen */}
            <div className="flex-1 p-3 text-[10px] leading-relaxed text-emerald-400 overflow-y-auto whitespace-pre-wrap max-h-56">
              {terminalOutput}
            </div>

            {/* Command Executor Input */}
            <div className="p-2.5 bg-gray-900 border-t border-gray-800 flex gap-2 items-center shrink-0">
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="npm run build..."
                className="flex-1 bg-black border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 outline-none font-mono"
              />
              <button
                onClick={runDiagnosticCommand}
                disabled={isCmdRunning || !command.trim()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-black rounded text-xs font-bold transition-colors flex items-center gap-1"
              >
                {isCmdRunning ? <RefreshCw size={11} className="animate-spin" /> : <Play size={11} />}
                Run
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
