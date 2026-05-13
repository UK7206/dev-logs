import React, { useState } from 'react';
import AnalyticsDashboard from './AnalyticsDashboard';
import MockStudio from './MockStudio';
import AutoTestGenerator from './AutoTestGenerator';
import ExecutionEngine from './ExecutionEngine';
import EnvironmentProfiles from './EnvironmentProfiles';
import WebhookSettings from './WebhookSettings';
import { X, Activity, Server, Code, TerminalSquare, Globe, Webhook } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function InsightEngineLayout({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'mock' | 'tests' | 'exec' | 'env' | 'webhook'>('analytics');
  const [shouldCrash, setShouldCrash] = useState(false);

  if (shouldCrash) {
    throw new Error('Simulated Application Crash for DevLogsErrorBoundary');
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-black flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <div className="bg-gray-950 border-b border-gray-800 p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-white font-bold text-xl tracking-wide">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            Insight Engine
          </div>

          <div className="flex gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'analytics' 
                  ? 'bg-gray-800 text-white shadow' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Activity className="w-4 h-4" /> Analytics
            </button>
            <button
              onClick={() => setActiveTab('mock')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'mock' 
                  ? 'bg-gray-800 text-white shadow' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Server className="w-4 h-4" /> Mock Studio
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'tests' 
                  ? 'bg-gray-800 text-white shadow' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Code className="w-4 h-4" /> Auto-Tests
            </button>
            <button
              onClick={() => setActiveTab('exec')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'exec' 
                  ? 'bg-gray-800 text-white shadow' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <TerminalSquare className="w-4 h-4 text-green-400" /> Exec Engine
            </button>
            <button
              onClick={() => setActiveTab('env')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'env' 
                  ? 'bg-gray-800 text-white shadow' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Globe className="w-4 h-4 text-purple-400" /> Env Profiles
            </button>
            <button
              onClick={() => setActiveTab('webhook')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'webhook' 
                  ? 'bg-gray-800 text-white shadow' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Webhook className="w-4 h-4 text-indigo-400" /> Webhooks
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShouldCrash(true)}
            className="p-2 text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-500/30"
          >
            Test Crash
          </button>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-900 hover:bg-red-500/20 hover:text-red-400 text-gray-400 rounded-lg transition-colors group"
          >
            <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-gray-900 min-h-0">
        <div style={{ display: activeTab === 'analytics' ? 'block' : 'none', height: '100%' }}>
          <AnalyticsDashboard />
        </div>
        <div style={{ display: activeTab === 'mock' ? 'block' : 'none', height: '100%' }}>
          <MockStudio />
        </div>
        <div style={{ display: activeTab === 'tests' ? 'block' : 'none', height: '100%' }}>
          <AutoTestGenerator />
        </div>
        <div style={{ display: activeTab === 'exec' ? 'block' : 'none', height: '100%' }}>
          <ExecutionEngine />
        </div>
        <div style={{ display: activeTab === 'env' ? 'block' : 'none', height: '100%' }}>
          <EnvironmentProfiles />
        </div>
        <div style={{ display: activeTab === 'webhook' ? 'block' : 'none', height: '100%' }}>
          <WebhookSettings />
        </div>
      </div>
    </div>
  );
}
