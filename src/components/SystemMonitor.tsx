import React, { useState, useEffect, useRef } from 'react';
import { Cpu, HardDrive, Server, Clock, Activity, Terminal, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function SystemMonitor() {
  const [metrics, setMetrics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ time: string; cpu: number; memory: number }[]>([]);

  const prevCpuRef = useRef<number | null>(null);
  const prevMemRef = useRef<number | null>(null);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/system/metrics');
      const json = await res.json();
      if (json.status === 'success') {
        // Record previous values before setting new ones
        setMetrics((current: any) => {
          if (current) {
            const oldMemPercent = current.memory.percent;
            const oldLoadAvg1 = current.cpu.loadAvg[0];
            const oldCpuPercent = Math.min((oldLoadAvg1 / current.cpu.cores) * 100, 100);
            prevCpuRef.current = oldCpuPercent;
            prevMemRef.current = oldMemPercent;
          }
          return json.data;
        });
        setError(null);

        // Calculate CPU/Mem and add to history
        const memPercent = json.data.memory.percent;
        const loadAvg1 = json.data.cpu.loadAvg[0];
        const cpuPercent = Math.min((loadAvg1 / json.data.cpu.cores) * 100, 100);
        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        setHistory(prev => {
          const next = [...prev, { time: timeString, cpu: cpuPercent, memory: memPercent }];
          if (next.length > 20) next.shift(); // keep last 20 points (40s of data)
          return next;
        });
      } else {
        setError(json.detail);
      }
    } catch (err) {
      setError('Failed to connect to the server metrics endpoint.');
    }
  };

  const renderTrend = (current: number, prev: number | null) => {
    if (prev === null) return null;
    const diff = current - prev;
    if (Math.abs(diff) < 0.2) {
      return <span className="text-gray-500 font-mono text-[10px] ml-1.5" title="No change">→</span>;
    }
    if (diff > 0) {
      return <span className="text-red-400 font-mono text-[10px] ml-1.5" title={`Increased by ${diff.toFixed(1)}%`}>↑ +{diff.toFixed(1)}%</span>;
    }
    return <span className="text-emerald-400 font-mono text-[10px] ml-1.5" title={`Decreased by ${Math.abs(diff).toFixed(1)}%`}>↓ -{Math.abs(diff).toFixed(1)}%</span>;
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-400 p-8">
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 max-w-md text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-bold mb-2">Metrics Unavailable</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex h-full items-center justify-center text-blue-400">
        <Activity className="w-8 h-8 animate-pulse" />
      </div>
    );
  }

  const memoryPercent = metrics.memory.percent;
  const heapPercent = (metrics.processMemory.heapUsed / metrics.processMemory.heapTotal) * 100 || 0;
  const loadAvg1 = metrics.cpu.loadAvg[0];
  const cpuPercent = Math.min((loadAvg1 / metrics.cpu.cores) * 100, 100);
  const showCpuAlert = cpuPercent > 80;
  const showMemAlert = memoryPercent > 85;
  const showAlert = showCpuAlert || showMemAlert;

  return (
    <div className="p-6 h-full overflow-y-auto text-gray-200">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-end pb-4 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white flex items-center gap-3 select-none">
                <Server className="w-6 h-6 text-emerald-400" />
                System Monitor
              </h1>
              
              {/* Blinking LIVE badge */}
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full mt-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[9px] font-bold text-emerald-400 tracking-wider uppercase select-none">LIVE</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm mt-1">Real-time telemetry and resource usage of the Dev-Logs server</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold select-none">System Uptime</div>
            <div className="font-mono text-emerald-400 font-medium">
              <Clock className="w-4 h-4 inline-block mr-2 -mt-0.5" />
              {formatUptime(metrics.uptime)}
            </div>
          </div>
        </div>

        {/* Alert Banner */}
        <AnimatePresence>
          {showAlert && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="bg-red-950/20 border border-red-500/40 rounded-xl p-4 flex items-center gap-3 overflow-hidden shadow-lg shadow-red-950/10"
            >
              <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider select-none">Critical Resource Alert</h4>
                <p className="text-[11px] text-red-200/80 mt-0.5">
                  {showCpuAlert && showMemAlert
                    ? `Both CPU (${cpuPercent.toFixed(1)}%) and System Memory (${memoryPercent.toFixed(1)}%) are experiencing extremely high load.`
                    : showCpuAlert
                    ? `CPU load is critical at ${cpuPercent.toFixed(1)}% (1-minute load average).`
                    : `System Memory usage is critical at ${memoryPercent.toFixed(1)}%.`
                  }
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* OS Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Terminal className="w-16 h-16" />
            </div>
            <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4 select-none">Environment</h3>
            <div className="space-y-3 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Platform</span>
                <span className="font-mono text-white capitalize">{metrics.os.platform} ({metrics.os.arch})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">OS Release</span>
                <span className="font-mono text-white">{metrics.os.release}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Node.js</span>
                <span className="font-mono text-green-400">{metrics.os.nodeVersion}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Process Uptime</span>
                <span className="font-mono text-white">{formatUptime(metrics.processUptime)}</span>
              </div>
            </div>
          </div>

          {/* CPU Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
            <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4 flex items-center justify-between select-none">
              CPU Usage
              <Cpu className="w-4 h-4 text-blue-400 animate-float" style={{ animationDuration: '4s' }} />
            </h3>
            <div className="mb-4">
              <div className="flex justify-between items-end mb-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white leading-none">{cpuPercent.toFixed(1)}%</span>
                  {renderTrend(cpuPercent, prevCpuRef.current)}
                </div>
                <span className="text-gray-500 text-sm font-mono leading-none">{metrics.cpu.cores} Cores</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${cpuPercent}%` }}
                  transition={{ ease: "easeOut", duration: 0.5 }}
                  className="h-2.5 rounded-full"
                  style={{
                    background: cpuPercent > 80 
                      ? 'linear-gradient(90deg, #ef4444 0%, #f97316 100%)' 
                      : cpuPercent > 50 
                      ? 'linear-gradient(90deg, #f59e0b 0%, #f97316 100%)'
                      : 'linear-gradient(90deg, #3b82f6 0%, #22d3ee 100%)'
                  }}
                />
                {/* Refresh Flash Sweep */}
                <motion.div
                  key={cpuPercent}
                  className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12 pointer-events-none"
                  initial={{ left: '-20%' }}
                  animate={{ left: '120%' }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="text-gray-400 truncate" title={metrics.cpu.model}>{metrics.cpu.model}</div>
              <div className="flex gap-4 font-mono text-[10px] text-gray-500">
                <span>Load: {metrics.cpu.loadAvg[0].toFixed(2)} (1m)</span>
                <span>{metrics.cpu.loadAvg[1].toFixed(2)} (5m)</span>
                <span>{metrics.cpu.loadAvg[2].toFixed(2)} (15m)</span>
              </div>
            </div>
          </div>

          {/* System Memory Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
            <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4 flex items-center justify-between select-none">
              System Memory
              <HardDrive className="w-4 h-4 text-purple-400 animate-float" style={{ animationDuration: '5s' }} />
            </h3>
            <div className="mb-4">
              <div className="flex justify-between items-end mb-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white leading-none">{memoryPercent.toFixed(1)}%</span>
                  {renderTrend(memoryPercent, prevMemRef.current)}
                </div>
                <span className="text-gray-500 text-sm font-mono leading-none">{formatBytes(metrics.memory.total)}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${memoryPercent}%` }}
                  transition={{ ease: "easeOut", duration: 0.5 }}
                  className="h-2.5 rounded-full"
                  style={{
                    background: memoryPercent > 85 
                      ? 'linear-gradient(90deg, #ef4444 0%, #ec4899 100%)' 
                      : memoryPercent > 60
                      ? 'linear-gradient(90deg, #f59e0b 0%, #ec4899 100%)'
                      : 'linear-gradient(90deg, #a855f7 0%, #ec4899 100%)'
                  }}
                />
                {/* Refresh Flash Sweep */}
                <motion.div
                  key={memoryPercent}
                  className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12 pointer-events-none"
                  initial={{ left: '-20%' }}
                  animate={{ left: '120%' }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
            <div className="flex justify-between text-sm mt-4 font-mono">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-gray-400">Used</span>
                <span className="text-white">{formatBytes(metrics.memory.used)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                <span className="text-gray-400">Free</span>
                <span className="text-white">{formatBytes(metrics.memory.free)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Telemetry History Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4 flex items-center justify-between">
            Real-Time Resource Telemetry
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          </h3>
          <div className="h-64">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="telemetryCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="telemetryMem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.3)" />
                  <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 9, fill: '#64748b' }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 9, fill: '#64748b' }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#cbd5e1'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#telemetryCpu)"
                    name="CPU Load (%)"
                  />
                  <Area
                    type="monotone"
                    dataKey="memory"
                    stroke="#a855f7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#telemetryMem)"
                    name="Memory Usage (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                Awaiting telemetry data...
              </div>
            )}
          </div>
        </div>

        {/* Node Process Detailed Memory */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg">
           <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-6 flex items-center gap-2">
            Node Process Memory Profile
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* V8 Heap Usage */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex justify-between mb-2">
                <span className="text-gray-300 font-medium">V8 Heap Usage</span>
                <span className="font-mono text-emerald-400">{formatBytes(metrics.processMemory.heapUsed)} / {formatBytes(metrics.processMemory.heapTotal)}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden mb-2 relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${heapPercent}%` }}
                  transition={{ ease: "easeOut", duration: 0.5 }}
                  className="h-full rounded-full bg-emerald-500 relative z-10"
                ></motion.div>
                <div className="absolute inset-0 flex items-center justify-center z-20 text-[10px] font-bold text-white shadow-sm mix-blend-difference">
                  {heapPercent.toFixed(1)}%
                </div>
              </div>
              <p className="text-xs text-gray-500">Dynamically allocated memory for JavaScript objects.</p>
            </div>

            {/* RSS & External */}
            <div className="col-span-1 md:col-span-2 space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400 text-sm">Resident Set Size (RSS)</span>
                  <span className="font-mono text-white text-sm">{formatBytes(metrics.processMemory.rss)}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">Total memory allocated for the process execution.</p>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400 text-sm">External (C++ Addons/Buffers)</span>
                  <span className="font-mono text-white text-sm">{formatBytes(metrics.processMemory.external)}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">Memory used by C++ objects bound to JavaScript objects.</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
