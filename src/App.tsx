import { useState, useEffect } from 'react';
import FloatingPanel from './components/FloatingPanel';
import FloatingBugButton from './components/FloatingBugButton';
import DevCapture from './components/DevCapture';
import KanbanDashboard from './components/KanbanDashboard';
import InsightEngineLayout from './components/InsightEngineLayout';
import MultiplayerCursors from './components/MultiplayerCursors';
import PerformanceHUD from './components/PerformanceHUD';
import HomeDashboard from './components/HomeDashboard';
import { installConsoleInterceptor, installNetworkInterceptor } from './components/DevCapture';

// Install interceptors on load
installConsoleInterceptor();
installNetworkInterceptor();

export default function App() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [kanbanOpen, setKanbanOpen] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);
  const [homeOpen, setHomeOpen] = useState(false);
  const [showHUD, setShowHUD] = useState(localStorage.getItem('devLogs_showHUD') !== 'false');

  // Listen for custom events
  useEffect(() => {
    const togglePanel = () => setPanelOpen((prev) => !prev);
    const openKanban = () => {
      setPanelOpen(false);
      setKanbanOpen(true);
    };
    const openInsight = () => {
      setPanelOpen(false);
      setInsightOpen(true);
    };
    const openHome = () => {
      setPanelOpen(false);
      setKanbanOpen(false);
      setInsightOpen(false);
      setHomeOpen(true);
    };
    const toggleHUD = () => {
      setShowHUD((prev) => {
        const next = !prev;
        localStorage.setItem('devLogs_showHUD', String(next));
        return next;
      });
    };

    window.addEventListener('dev-capture:open', togglePanel);
    window.addEventListener('dev-logs:open-kanban', openKanban);
    window.addEventListener('dev-logs:open-insight', openInsight);
    window.addEventListener('dev-logs:open-home', openHome);
    window.addEventListener('dev-logs:toggle-hud', toggleHUD);

    return () => {
      window.removeEventListener('dev-capture:open', togglePanel);
      window.removeEventListener('dev-logs:open-kanban', openKanban);
      window.removeEventListener('dev-logs:open-insight', openInsight);
      window.removeEventListener('dev-logs:open-home', openHome);
      window.removeEventListener('dev-logs:toggle-hud', toggleHUD);
    };
  }, []);

  if (homeOpen) {
    return (
      <>
        <HomeDashboard
          onClose={() => setHomeOpen(false)}
          onOpenPanel={() => { setHomeOpen(false); setPanelOpen(true); }}
          onOpenKanban={() => { setHomeOpen(false); setKanbanOpen(true); }}
          onOpenInsight={() => { setHomeOpen(false); setInsightOpen(true); }}
        />
        <MultiplayerCursors />
        {showHUD && <PerformanceHUD />}
      </>
    );
  }

  if (kanbanOpen) {
    return (
      <>
        <KanbanDashboard onClose={() => setKanbanOpen(false)} />
        <MultiplayerCursors />
        {showHUD && <PerformanceHUD />}
      </>
    );
  }

  if (insightOpen) {
    return (
      <>
        <InsightEngineLayout onClose={() => setInsightOpen(false)} />
        <MultiplayerCursors />
        {showHUD && <PerformanceHUD />}
      </>
    );
  }

  return (
    <>
      <MultiplayerCursors />
      {showHUD && <PerformanceHUD />}
      {/* Floating panel */}
      <div data-dev-logs-panel>
        <FloatingPanel
          isOpen={panelOpen}
          onClose={() => setPanelOpen(false)}
          onOpenCapture={() => {
            setPanelOpen(false);
            setCaptureOpen(true);
          }}
        />
      </div>

      {/* Floating Bug Button */}
      <div data-dev-logs-button>
        <FloatingBugButton />
      </div>

      {/* DevCapture full-screen overlay (for advanced capture mode) */}
      <DevCapture open={captureOpen} onClose={() => setCaptureOpen(false)} />
    </>
  );
}
