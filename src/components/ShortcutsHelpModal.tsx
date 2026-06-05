import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard, Command } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsHelpModal({ isOpen, onClose }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl z-10 overflow-hidden font-sans text-slate-100"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-20 -left-20 w-48 h-48 rounded-full opacity-10 bg-purple-500 blur-[50px] pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-48 h-48 rounded-full opacity-10 bg-cyan-500 blur-[50px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                  <Keyboard className="w-4.5 h-4.5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Keyboard Shortcuts</h3>
                  <p className="text-[10px] text-slate-400">Boost your workflow productivity</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Shortcut Grid */}
            <div className="space-y-4 relative z-10">
              {/* Category: Global */}
              <div>
                <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">Global Actions</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                    <span className="text-xs text-slate-300">Toggle Bug Capture Panel</span>
                    <kbd className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 font-bold shadow-md animate-pulse">
                      Ctrl + D
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                    <span className="text-xs text-slate-300">Close Modals / Overlays</span>
                    <kbd className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 font-bold shadow-md">
                      Esc
                    </kbd>
                  </div>
                </div>
              </div>

              {/* Category: Whiteboard */}
              <div>
                <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2">Whiteboard Canvas</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                    <span className="text-xs text-slate-300">Pan Canvas</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 font-bold shadow-md">Alt</kbd>
                      <span className="text-[10px] text-slate-500">+</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 font-bold shadow-md">Drag</kbd>
                      <span className="text-[10px] text-slate-500">or</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 font-bold shadow-md">Middle-Click</kbd>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                    <span className="text-xs text-slate-300">Zoom In / Out</span>
                    <div className="flex items-center gap-1">
                      <kbd className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 font-bold shadow-md">
                        Ctrl
                      </kbd>
                      <span className="text-[10px] text-slate-500">+</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 font-bold shadow-md">Wheel</kbd>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                    <span className="text-xs text-slate-300">Delete Selected Node</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 font-bold shadow-md">Delete</kbd>
                      <span className="text-[10px] text-slate-500">or</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 font-bold shadow-md">Backspace</kbd>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category: Execution & Telemetry */}
              <div>
                <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">Engines & Diagnostics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-xs text-slate-300">Submit Command / Query</span>
                    <kbd className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 font-bold shadow-md">
                      Enter
                    </kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-500 mt-6 pt-3 border-t border-slate-800/80">
              Press anywhere outside this card or Esc to close the guide.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
