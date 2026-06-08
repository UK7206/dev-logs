import React, { useState } from 'react';
import AnalyticsDashboard from './AnalyticsDashboard';
import ArchitectureCanvas from './ArchitectureCanvas';
import MockStudio from './MockStudio';
import AutoTestGenerator from './AutoTestGenerator';
import ExecutionEngine from './ExecutionEngine';
import EnvironmentProfiles from './EnvironmentProfiles';
import WebhookSettings from './WebhookSettings';
import ApiReplay from './ApiReplay';
import DatabaseExplorer from './DatabaseExplorer';
import SystemMonitor from './SystemMonitor';
import DevToolkit from './DevToolkit';
import AgentStudio from './AgentStudio';
import { X, Activity, Server, Code, TerminalSquare, Globe, Webhook, RefreshCcw, Database, HardDrive, Wrench, Share2, BrainCircuit, HelpCircle, History, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ShortcutsHelpModal from './ShortcutsHelpModal';
import ActivityLog from './ActivityLog';

interface Props {
  onClose: () => void;
}

export default function InsightEngineLayout({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'agent' | 'canvas' | 'mock' | 'tests' | 'exec' | 'env' | 'webhook' | 'replay' | 'db' | 'sys' | 'tools' | 'logs'>('analytics');
  const [shouldCrash, setShouldCrash] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  if (shouldCrash) {
    throw new Error('Simulated Application Crash for DevLogsErrorBoundary');
  }

  const renderTabContent = () => {
    switch(activeTab) {
      case 'analytics': return <AnalyticsDashboard />;
      case 'logs': return <ActivityLog />;
      case 'agent': return <AgentStudio />;
      case 'canvas': return <ArchitectureCanvas />;
      case 'mock': return <MockStudio />;
      case 'tests': return <AutoTestGenerator />;
      case 'exec': return <ExecutionEngine />;
      case 'env': return <EnvironmentProfiles />;
      case 'webhook': return <WebhookSettings />;
      case 'replay': return <ApiReplay />;
      case 'db': return <DatabaseExplorer />;
      case 'sys': return <SystemMonitor />;
      case 'tools': return <DevToolkit />;
      default: return null;
    }
  };

  const getBreadcrumbName = (tabId: string) => {
    const tabNames: Record<string, string> = {
      analytics: 'Analytics & Insights',
      logs: 'Activity Log History',
      agent: 'AI Agent Playground',
      canvas: 'System Architecture Map',
      mock: 'API Mocking Studio',
      tests: 'Auto Test Generator',
      exec: 'Execution Engine shell',
      db: 'Database Explorer UI',
      sys: 'System Health Monitor',
      tools: 'Dev Toolkit Utilities',
      env: 'Environment Profiles',
      webhook: 'Webhook Settings',
      replay: 'API Replay Agent'
    };
    return tabNames[tabId] || tabId;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[99999] bg-black flex flex-col font-sans page-transition"
    >
      {/* Top Navigation Bar */}
      <div className="bg-gray-950 border-b border-gray-900 p-4 flex justify-between items-center shrink-0 gap-6">
        <div className="flex items-center gap-6 flex-1 min-w-0">
          {/* Logo & Breadcrumbs */}
          <div className="flex flex-col shrink-0">
            <div className="flex items-center gap-2 text-white font-bold text-base tracking-wide">
              <div className="w-7 h-7 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg animate-float">
                <Activity className="w-4 h-4 text-white" />
              </div>
              Insight Engine
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-1 select-none font-medium">
              <span>Home</span>
              <ChevronRight size={10} className="text-gray-700" />
              <span className="text-cyan-400 font-semibold">{getBreadcrumbName(activeTab)}</span>
              <span className="text-gray-700">•</span>
              <button 
                onClick={() => setShouldCrash(true)} 
                className="text-red-500/40 hover:text-red-500 transition-colors text-[9px] font-semibold hover:underline"
                title="Trigger simulated application crash to test error boundary"
              >
                Test Crash
              </button>
            </div>
          </div>

          {/* Scrollable Tab bar wrapper with gradient fade */}
          <div className="relative flex-1 min-w-0 max-w-[820px] ml-2">
            <div className="flex gap-1.5 bg-gray-900/60 p-1 rounded-lg border border-gray-800 overflow-x-auto scrollbar-none pr-8">
              {[
                { id: 'analytics', icon: Activity, label: 'Analytics', color: 'text-cyan-400', underlineColor: '#22d3ee' },
                { id: 'logs', icon: History, label: 'Activity Log', color: 'text-yellow-400', underlineColor: '#eab308' },
                { id: 'agent', icon: BrainCircuit, label: 'AI Agent Studio', color: 'text-purple-400', underlineColor: '#a855f7' },
                { id: 'canvas', icon: Share2, label: 'Architecture', color: 'text-pink-400', underlineColor: '#f472b6' },
                { id: 'mock', icon: Server, label: 'Mock Studio', color: 'text-blue-400', underlineColor: '#60a5fa' },
                { id: 'tests', icon: Code, label: 'Auto-Tests', color: 'text-emerald-400', underlineColor: '#34d399' },
                { id: 'exec', icon: TerminalSquare, label: 'Exec Engine', color: 'text-green-400', underlineColor: '#4ade80' },
                { id: 'db', icon: Database, label: 'DB Explorer', color: 'text-sky-400', underlineColor: '#38bdf8' },
                { id: 'sys', icon: HardDrive, label: 'System', color: 'text-emerald-400', underlineColor: '#34d399' },
                { id: 'tools', icon: Wrench, label: 'Dev Tools', color: 'text-amber-500', underlineColor: '#f59e0b' },
                { id: 'env', icon: Globe, label: 'Env Profiles', color: 'text-indigo-400', underlineColor: '#818cf8' },
                { id: 'webhook', icon: Webhook, label: 'Webhooks', color: 'text-violet-400', underlineColor: '#a78bfa' },
                { id: 'replay', icon: RefreshCcw, label: 'API Replay', color: 'text-orange-400', underlineColor: '#fb923c' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors shrink-0 ${
                    activeTab === tab.id 
                      ? 'text-white' 
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTabBg"
                      className="absolute inset-0 bg-gray-800/80 rounded-md shadow"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full z-10"
                      style={{ backgroundColor: tab.underlineColor }}
                      initial={false}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <tab.icon className={`w-3.5 h-3.5 ${tab.color}`} /> {tab.label}
                  </span>
                </button>
              ))}
            </div>
            {/* Gradient fade on the right edge */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-950 to-transparent pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 text-slate-300 hover:text-white transition-all shadow-sm"
          >
            <span>Back to Home</span>
            <ChevronRight size={12} className="opacity-60" />
          </button>
          <button
            onClick={() => setShowShortcuts(true)}
            className="p-2 bg-gray-900 hover:bg-purple-500/20 hover:text-purple-400 text-gray-400 rounded-lg transition-colors group"
            title="Keyboard Shortcuts Guide"
          >
            <HelpCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-900 hover:bg-red-500/20 hover:text-red-400 text-gray-400 rounded-lg transition-colors group"
            title="Close"
          >
            <X className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-gray-950 min-h-0 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
      <ShortcutsHelpModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </motion.div>
  );
}
