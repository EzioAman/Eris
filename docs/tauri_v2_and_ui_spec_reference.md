# Tauri v2 Desktop & Frontend Specification Reference
**Document Type**: Official Technical Verification & Integration Reference
**Status**: Verified against 2025/2026 Tauri v2 & Next.js Standards
**Target Frameworks**: Tauri v2 (`@tauri-apps/api` v2), Next.js 14+ (Static Export), xterm.js (`@xterm/xterm` v5), `tauri-plugin-pty`

---

## 1. Tauri v2 Architecture & Static Export Setup

In Tauri v2, the frontend runs inside a native OS webview (WebView2 on Windows). Because no Node.js runtime is packaged inside the release binary, the Next.js application must be compiled as a static client-side single page application.

### 1.1 Next.js Configuration (`next.config.mjs`)
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true, // Crucial: default Next image optimizer requires Node server
  },
  trailingSlash: true, // Prevents 404s on deep reload inside Tauri webview
};

export default nextConfig;
```

### 1.2 Tauri Configuration (`src-tauri/tauri.conf.json`)
```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../out"
  },
  "app": {
    "windows": [
      {
        "title": "ERIS — Project Interface",
        "width": 1440,
        "height": 900,
        "minWidth": 1024,
        "minHeight": 720,
        "decorations": true,
        "transparent": false
      }
    ],
    "security": {
      "csp": "default-src 'self'; img-src 'self' asset: https: data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws://localhost:* http://localhost:*;"
    }
  }
}
```

---

## 2. Capabilities-Based Security Model in Tauri v2

Tauri v2 enforces a default-deny security posture managed through JSON capability files in `src-tauri/capabilities/`.

### 2.1 Default Capability (`src-tauri/capabilities/default.json`)
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default-capability",
  "description": "Permissions required for ERIS Core UI",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "opener:default",
    "shell:allow-execute"
  ]
}
```

### 2.2 Shell & PTY Permission Boundaries
- **Rule 1**: Arbitrary shell execution is forbidden by default.
- **Rule 2**: When "Windows Terminal Mode" is activated by the user, the application uses `tauri-plugin-pty` to bind an interactive session directly to `powershell.exe`.
- **Rule 3**: When "Sandbox Mode" is active, all tool invocations are executed through a sandboxed Python runner or containerized process with standard I/O pipes intercepted and filtered.

---

## 3. Windows Terminal Integration via PTY (`tauri-plugin-pty` + xterm.js)

To provide direct process visibility and interactive terminal capabilities:

### 3.1 Dependencies
- Rust crate: `tauri-plugin-pty = "2.0"`
- Frontend npm: `tauri-pty`, `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links`

### 3.2 Frontend Terminal Component Setup
```typescript
import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { spawn } from 'tauri-pty';
import '@xterm/xterm/css/xterm.css';

export function InteractiveTerminal({ mode }: { mode: 'sandbox' | 'terminal' }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const term = new Terminal({
      theme: {
        background: '#080A10',
        foreground: '#F1F5F9',
        cursor: '#A78BFA',
        selectionBackground: 'rgba(124, 58, 237, 0.4)',
      },
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 13,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    if (mode === 'terminal') {
      const pty = spawn('powershell.exe', [], {
        cols: term.cols,
        rows: term.rows,
      });

      pty.onData((data: string) => term.write(data));
      term.onData((data: string) => pty.write(data));

      return () => {
        pty.kill();
        term.dispose();
      };
    } else {
      term.writeln('\x1b[38;2;56;189;248m[*] ERIS Sandbox Execution Mode Active\x1b[0m');
      term.writeln('\x1b[38;2;148;163;184m[i] Tool invocations run within isolated subprocess jail.\x1b[0m');
      return () => {
        term.dispose();
      };
    }
  }, [mode]);

  return <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden border border-white/10" />;
}
```

---

## 4. State Management with Zustand & Real-Time Pulse

### 4.1 System Store (`src/stores/systemStore.ts`)
```typescript
import { create } from 'zustand';
import { SystemStatusData, ExecutionMode } from '@/types';

interface SystemStoreState {
  status: SystemStatusData;
  setExecutionMode: (mode: ExecutionMode) => void;
  updateMetrics: (metrics: Partial<SystemStatusData>) => void;
}

export const useSystemStore = create<SystemStoreState>((set) => ({
  status: {
    operational: true,
    lastUpdated: 'Just now',
    providerCount: 12,
    uptimePercent: 99.9,
    avgLatencyMs: 42,
    activeProcesses: 3,
    executionMode: 'sandbox', // Default secure
  },
  setExecutionMode: (mode) =>
    set((state) => ({ status: { ...state.status, executionMode: mode } })),
  updateMetrics: (metrics) =>
    set((state) => ({ status: { ...state.status, ...metrics } })),
}));
```

### 4.2 Activity Pulse WebSocket Client (`src/services/pulseClient.ts`)
- Maintains reconnecting WebSocket connection to `ws://localhost:8000/ws/pulse`.
- Dispatches parsed messages into `useActivityStore`.
- Implements exponential backoff on disconnect (`1s -> 2s -> 4s -> max 10s`).
- Displays immediate visual badge in `TopBar` if offline.
