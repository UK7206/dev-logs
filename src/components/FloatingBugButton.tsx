import { useEffect, useState } from 'react';
import { Bug } from 'lucide-react';

export default function FloatingBugButton() {
  const [errorCount, setErrorCount] = useState(0);

  // Check for console errors periodically
  useEffect(() => {
    const check = () => {
      const buf = (window as any).__consoleBuffer as
        | { level: string }[]
        | undefined;
      const count = buf ? buf.filter((e) => e.level === 'error').length : 0;
      setErrorCount(count);
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  // Ctrl+D keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('dev-capture:open'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const hasErrors = errorCount > 0;

  return (
    <div className="fixed bottom-6 right-6 z-40 group">
      {/* Custom Tooltip */}
      <div className="absolute right-0 bottom-full mb-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-end whitespace-nowrap">
        <div className="bg-[#0b0f19] border border-red-500/30 text-xs px-3 py-1.5 rounded-lg shadow-xl text-slate-200 flex flex-col items-end gap-0.5">
          <span className="font-semibold flex items-center gap-1.5">
            {hasErrors ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400">{errorCount} error{errorCount > 1 ? 's' : ''} detected</span>
              </>
            ) : (
              <span className="text-slate-300">Report a bug</span>
            )}
          </span>
          <span className="text-[10px] text-slate-400">Press <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300 font-mono text-[9px]">Ctrl+D</kbd> anywhere</span>
        </div>
        {/* Tooltip arrow */}
        <div className="w-2 h-2 bg-[#0b0f19] border-r border-b border-red-500/30 transform rotate-45 mr-5 -mt-1" />
      </div>

      <button
        onClick={() => window.dispatchEvent(new CustomEvent('dev-capture:open'))}
        className="relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 focus:outline-none"
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          boxShadow: hasErrors
            ? '0 0 24px rgba(239, 68, 68, 0.6), 0 0 48px rgba(168, 85, 247, 0.3)'
            : '0 4px 20px rgba(124, 58, 237, 0.4)',
          animation: hasErrors ? 'floating-bug-pulse 2s ease-in-out infinite' : undefined,
        }}
      >
        <Bug size={20} className="text-white" />

        {/* Error Badge */}
        {hasErrors && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full flex items-center justify-center border border-[#0b0f19] shadow-lg animate-bounce">
            {errorCount}
          </span>
        )}

        {/* Subtle ping indicator dot when errors exist */}
        {hasErrors && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500/30 animate-ping pointer-events-none" />
        )}
      </button>

      <style>{`
        @keyframes floating-bug-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.5), 0 0 40px rgba(168, 85, 247, 0.2); }
          50% { box-shadow: 0 0 30px rgba(239, 68, 68, 0.8), 0 0 60px rgba(168, 85, 247, 0.4); }
        }
      `}</style>
    </div>
  );
}

