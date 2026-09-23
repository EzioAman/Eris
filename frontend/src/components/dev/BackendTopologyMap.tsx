import React, { useRef, useState, useEffect, forwardRef } from 'react';
import { AnimatedBeam } from '../magicui/animated-beam';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

// ─── Topology Node ────────────────────────────────────────────────────
const TopologyNode = forwardRef<
  HTMLDivElement,
  {
    className?: string;
    children?: React.ReactNode;
    label: string;
    sublabel?: string;
    status?: 'connected' | 'disconnected' | 'loading';
  }
>(({ className, children, label, sublabel, status = 'loading' }, ref) => {
  const statusColors = {
    connected: 'bg-emerald-500 shadow-emerald-500/50',
    disconnected: 'bg-red-500 shadow-red-500/50',
    loading: 'bg-amber-500 shadow-amber-500/50 animate-pulse',
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        ref={ref}
        className={cn(
          'z-10 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-[#0E121E]/90 p-3 shadow-[0_0_20px_-12px_rgba(139,92,246,0.5)] backdrop-blur-md transition-all hover:border-violet-500/40 hover:shadow-[0_0_30px_-8px_rgba(139,92,246,0.4)]',
          className
        )}
      >
        {children}
      </div>
      <span className="text-[11px] font-medium text-neutral-300 tracking-wide max-w-[80px] text-center leading-tight">
        {label}
      </span>
      {sublabel && (
        <span className="text-[11px] text-neutral-500 -mt-1">{sublabel}</span>
      )}
      <div className={cn('w-1.5 h-1.5 rounded-full shadow-sm -mt-0.5', statusColors[status])} />
    </div>
  );
});
TopologyNode.displayName = 'TopologyNode';

// ─── SVG Icons (Stroke-rounded style from Hugeicons/Iconify) ──────────
const Icons = {
  erisCore: () => (
    <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-violet-400">
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  auth: () => (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-cyan-400">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  ),
  rag: () => (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-emerald-400">
      <path d="M12 3v18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 12h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  guardrails: () => (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-amber-400">
      <path d="M12 9v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 17h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  tool: () => (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-sky-400">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  websocket: () => (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-pink-400">
      <path d="M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 5v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 5l14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M19 5L5 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  vector: () => (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-teal-400">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 22.08V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  model: () => (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-rose-400">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

// ─── Backend State Interface ──────────────────────────────────────────
interface BackendState {
  isConnected: boolean;
  activeModel: string;
  executionMode: string;
  currentUser: string | null;
  toolsCount: number;
  tools: Array<{ name: string; file: string; description: string }>;
  platform: string;
  isAuthenticated: boolean;
  emotion: string;
}

// ─── ToolBeams helper (reads refs in effect, not during render) ───────
interface ToolBeamsProps {
  containerRef: React.RefObject<HTMLElement | null>;
  coreRef: React.RefObject<HTMLElement | null>;
  toolRefs: React.RefObject<(HTMLDivElement | null)[]>;
  toolCount: number;
}

const ToolBeams: React.FC<ToolBeamsProps> = ({ containerRef, coreRef, toolRefs, toolCount }) => {
  const [activeIndices, setActiveIndices] = useState<number[]>([]);

  useEffect(() => {
    // Read refs inside effect, not during render
    const indices: number[] = [];
    const refs = toolRefs.current;
    if (!refs) return;
    for (let i = 0; i < Math.max(toolCount, 1); i++) {
      if (refs[i]) indices.push(i);
    }
    setActiveIndices(indices);
  }, [toolRefs, toolCount]);

  return (
    <>
      {activeIndices.map((i) => (
        <AnimatedBeam
          key={`tool-beam-${i}`}
          containerRef={containerRef}
          fromRef={coreRef}
          toRef={{ current: toolRefs.current?.[i] ?? null }}
          curvature={i % 2 === 0 ? 30 : -30}
          startYOffset={8}
          reverse
          gradientStartColor="#8B5CF6"
          gradientStopColor="#38BDF8"
          pathOpacity={toolCount === 0 ? 0.1 : 0.2}
        />
      ))}
    </>
  );
};

// ─── Main Topology Map Component ──────────────────────────────────────
interface BackendTopologyMapProps {
  onClose: () => void;
}

export const BackendTopologyMap: React.FC<BackendTopologyMapProps> = ({ onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Node refs
  const authRef = useRef<HTMLDivElement>(null);
  const ragRef = useRef<HTMLDivElement>(null);
  const guardrailRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<HTMLDivElement>(null);
  const vectorRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const toolRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [backendState, setBackendState] = useState<BackendState>({
    isConnected: false,
    activeModel: 'Unknown',
    executionMode: 'speed',
    currentUser: null,
    toolsCount: 0,
    tools: [],
    platform: 'unknown',
    isAuthenticated: false,
    emotion: 'idle',
  });

  const [connectionStatus, setConnectionStatus] = useState<Record<string, 'connected' | 'disconnected' | 'loading'>>({
    auth: 'loading',
    rag: 'loading',
    guardrails: 'loading',
    core: 'loading',
    ws: 'loading',
    vector: 'loading',
    model: 'loading',
  });

  // Fetch backend state
  useEffect(() => {
    const fetchBackendState = async () => {
      try {
        // Fetch system state
        const stateRes = await fetch('/api/system/state');
        if (stateRes.ok) {
          const stateData = await stateRes.json();
          if (stateData.ok) {
            setBackendState((prev) => ({
              ...prev,
              isConnected: true,
              activeModel: stateData.active_model || 'Unknown',
              executionMode: stateData.execution_mode || 'speed',
              currentUser: stateData.current_user,
              toolsCount: stateData.tools_count || 0,
              platform: stateData.platform || 'unknown',
              isAuthenticated: stateData.is_authenticated || false,
              emotion: stateData.current_emotion || 'idle',
            }));

            // Set statuses based on backend response
            setConnectionStatus({
              core: 'connected',
              auth: 'connected',
              rag: 'connected',
              guardrails: 'connected',
              ws: 'connected',
              vector: 'connected',
              model: stateData.active_model ? 'connected' : 'disconnected',
            });
          }
        } else {
          throw new Error('Backend unreachable');
        }
      } catch {
        setConnectionStatus({
          core: 'disconnected',
          auth: 'disconnected',
          rag: 'disconnected',
          guardrails: 'disconnected',
          ws: 'disconnected',
          vector: 'disconnected',
          model: 'disconnected',
        });
      }

      try {
        // Fetch tools list
        const toolsRes = await fetch('/api/tools/list');
        if (toolsRes.ok) {
          const toolsData = await toolsRes.json();
          if (toolsData.ok) {
            setBackendState((prev) => ({
              ...prev,
              tools: toolsData.tools || [],
              toolsCount: toolsData.tools?.length || 0,
            }));
          }
        }
      } catch {
        // Tools API unavailable — not critical
      }
    };

    fetchBackendState();
    const interval = setInterval(fetchBackendState, 10000);
    return () => clearInterval(interval);
  }, []);

  const displayTools = backendState.tools.slice(0, 4);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center">
      <div className="w-full max-w-4xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white text-lg font-light tracking-[0.15em] uppercase">
              Backend Topology
            </h2>
            <p className="text-neutral-500 text-xs mt-0.5">
              Live connectivity map · {backendState.isConnected ? 'Backend Online' : 'Backend Offline'}
              {backendState.isConnected && (
                <span className="inline-flex items-center ml-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
                  <span className="text-emerald-400">Connected</span>
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-neutral-700 bg-black/60 hover:bg-neutral-800 text-neutral-300 text-xs"
          >
            Close · Ctrl+Shift+D
          </Button>
        </div>

        {/* Topology Map */}
        <div
          ref={containerRef}
          className="relative glass-panel rounded-2xl p-8 sm:p-12 min-h-[420px] flex items-center justify-center overflow-hidden"
        >
          <div className="flex size-full max-h-[360px] max-w-2xl flex-col items-stretch justify-between gap-12">
            {/* Top row: Auth, RAG, Guardrails */}
            <div className="flex flex-row items-start justify-between">
              <TopologyNode ref={authRef} label="Auth Engine" sublabel="OTP + Sessions" status={connectionStatus.auth}>
                <Icons.auth />
              </TopologyNode>
              <TopologyNode ref={ragRef} label="RAG Engine" sublabel="BM25 + Vector" status={connectionStatus.rag}>
                <Icons.rag />
              </TopologyNode>
              <TopologyNode ref={guardrailRef} label="Guardrails" sublabel="Tool Audit" status={connectionStatus.guardrails}>
                <Icons.guardrails />
              </TopologyNode>
            </div>

            {/* Middle row: WebSocket, CORE, Model */}
            <div className="flex flex-row items-center justify-between">
              <TopologyNode ref={wsRef} label="WebSocket" sublabel="IPC Bus" status={connectionStatus.ws}>
                <Icons.websocket />
              </TopologyNode>
              <TopologyNode
                ref={coreRef}
                label="ERIS Core"
                sublabel={backendState.executionMode}
                status={connectionStatus.core}
                className="size-18 rounded-2xl border-violet-500/30 shadow-[0_0_30px_-8px_rgba(139,92,246,0.5)]"
              >
                <Icons.erisCore />
              </TopologyNode>
              <TopologyNode ref={modelRef} label="LLM Model" sublabel={backendState.activeModel.split('/').pop() || 'Unknown'} status={connectionStatus.model}>
                <Icons.model />
              </TopologyNode>
            </div>

            {/* Bottom row: Vector Memory + Dynamic Tools */}
            <div className="flex flex-row items-end justify-between">
              <TopologyNode ref={vectorRef} label="Vector Vault" sublabel="sqlite-vec" status={connectionStatus.vector}>
                <Icons.vector />
              </TopologyNode>
              {displayTools.map((tool, i) => (
                <TopologyNode
                  key={tool.name}
                  ref={(el) => { toolRefs.current[i] = el; }}
                  label={tool.name}
                  sublabel={tool.file}
                  status={backendState.isConnected ? 'connected' : 'disconnected'}
                >
                  <Icons.tool />
                </TopologyNode>
              ))}
              {displayTools.length === 0 && (
                <TopologyNode
                  ref={(el) => { toolRefs.current[0] = el; }}
                  label="No Tools"
                  sublabel="None loaded"
                  status="disconnected"
                >
                  <Icons.tool />
                </TopologyNode>
              )}
            </div>
          </div>

          {/* Animated Beams — Left inputs → Core */}
          <AnimatedBeam containerRef={containerRef} fromRef={authRef} toRef={coreRef} curvature={-50} endYOffset={-8} gradientStartColor="#38BDF8" gradientStopColor="#8B5CF6" />
          <AnimatedBeam containerRef={containerRef} fromRef={ragRef} toRef={coreRef} curvature={-20} gradientStartColor="#10B981" gradientStopColor="#8B5CF6" />
          <AnimatedBeam containerRef={containerRef} fromRef={guardrailRef} toRef={coreRef} curvature={50} endYOffset={-8} gradientStartColor="#F59E0B" gradientStopColor="#8B5CF6" />

          {/* Middle row → Core */}
          <AnimatedBeam containerRef={containerRef} fromRef={wsRef} toRef={coreRef} gradientStartColor="#EC4899" gradientStopColor="#8B5CF6" />
          <AnimatedBeam containerRef={containerRef} fromRef={modelRef} toRef={coreRef} reverse gradientStartColor="#F43F5E" gradientStopColor="#8B5CF6" />

          {/* Core → Bottom outputs */}
          <AnimatedBeam containerRef={containerRef} fromRef={coreRef} toRef={vectorRef} curvature={50} startYOffset={8} reverse gradientStartColor="#8B5CF6" gradientStopColor="#14B8A6" />

          {/* Core → Tools: rendered via state to avoid ref-during-render lint */}
          <ToolBeams
            containerRef={containerRef}
            coreRef={coreRef}
            toolRefs={toolRefs}
            toolCount={displayTools.length}
          />
        </div>

        {/* Live Stats Footer */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-neutral-500 uppercase tracking-wider">
          <span>Platform: {backendState.platform}</span>
          <span className="text-neutral-700">•</span>
          <span>Mode: {backendState.executionMode}</span>
          <span className="text-neutral-700">•</span>
          <span>Tools: {backendState.toolsCount}</span>
          <span className="text-neutral-700">•</span>
          <span>User: {backendState.currentUser || 'Anonymous'}</span>
          <span className="text-neutral-700">•</span>
          <span>Emotion: {backendState.emotion}</span>
        </div>
      </div>
    </div>
  );
};

export default BackendTopologyMap;
