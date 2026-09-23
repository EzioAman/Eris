import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  RefreshCw,
  Database,
  Key,
  Shield,
  Trash2,
  Edit2,
  Plus,
  Check,
  Copy,
  Users,
  KeyRound,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDevMode } from '../../context/DevModeContext';
import { BadgeTemplate } from '../../../ui_templates/BadgeTemplate';
import { SkeletonTemplate } from '../../../ui_templates/SkeletonTemplate';

interface DevDataViewerProps {
  onClose: () => void;
}

interface LocalKeyItem {
  key: string;
  value: string;
}

interface LocalDataUser {
  id: string;
  email: string;
  display_name: string;
  is_verified: boolean;
  role: string;
  created_at: string | null;
}

interface LocalDataStats {
  user_count: number;
  session_count: number;
  otp_count: number;
  audit_log_count: number;
  users?: LocalDataUser[];
}

interface BackendHealth {
  ok: boolean;
  status: string;
  subsystems: Record<
    string,
    {
      name: string;
      status: string;
      database?: string;
      target: string;
      count?: number;
    }
  >;
}

export const DevDataViewer: React.FC<DevDataViewerProps> = ({ onClose }) => {
  const { isDevMode, setDevMode } = useDevMode();

  const [keys, setKeys] = useState<LocalKeyItem[]>([]);
  const [session, setSession] = useState<{
    email?: string;
    token?: string;
    displayName?: string;
    expiresAt?: number;
  } | null>(null);

  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [stats, setStats] = useState<LocalDataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'storage' | 'backend' | 'db'>('storage');

  // Editing state for localStorage key
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // New key state
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Copy notification
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Dev password reset state
  const [resettingUser, setResettingUser] = useState<string | null>(null);
  const [customPassword, setCustomPassword] = useState('password123');
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [devExecutionMode, setDevExecutionMode] = useState<'speed' | 'accuracy'>('speed');

  const handleDevResetPassword = async (email: string, pass: string) => {
    try {
      setResetStatus(`Resetting password for ${email}...`);
      const res = await fetch('/api/system/dev-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, new_password: pass }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetStatus(`✓ Password for ${email} reset to "${pass}"!`);
        collectData();
      } else {
        setResetStatus(`Error: ${data?.detail || 'Failed to reset password'}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResetStatus(`Network error: ${msg}`);
    }
    setTimeout(() => setResetStatus(null), 6000);
  };

  const collectData = useCallback(async () => {
    setLoading(true);

    // 1. Collect localStorage items
    const collected: LocalKeyItem[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) {
          collected.push({ key: k, value: localStorage.getItem(k) || '' });
        }
      }
    } catch {
      // ignore
    }
    setKeys(collected);

    // Parse active session
    try {
      const raw = localStorage.getItem('eris_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        setSession({
          email: parsed.email,
          token: parsed.token,
          displayName: parsed.user_display_name,
          expiresAt: parsed.expires_at,
        });
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    }

    // 2. Query backend health
    try {
      const res = await fetch('/api/system/health');
      if (res.ok) {
        setHealth(await res.json());
      }
    } catch {
      setHealth(null);
    }

    // 3. Query dev database stats
    try {
      const res = await fetch('/api/system/local-data');
      if (res.ok) {
        setStats(await res.json());
      }
    } catch {
      setStats(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    collectData();
  }, [collectData]);

  // Handle key deletion
  const handleDeleteKey = (targetKey: string) => {
    try {
      localStorage.removeItem(targetKey);
      collectData();
    } catch (err) {
      console.warn('Failed to delete key:', err);
    }
  };

  // Handle key save
  const handleSaveEdit = (targetKey: string) => {
    try {
      localStorage.setItem(targetKey, editValue);
      setEditingKey(null);
      collectData();
    } catch (err) {
      console.warn('Failed to save key:', err);
    }
  };

  // Handle adding new key
  const handleAddKey = () => {
    if (!newKey.trim()) return;
    try {
      localStorage.setItem(newKey.trim(), newValue);
      setNewKey('');
      setNewValue('');
      setShowAddModal(false);
      collectData();
    } catch (err) {
      console.warn('Failed to add key:', err);
    }
  };

  // Handle clearing session
  const handleClearSession = () => {
    try {
      localStorage.removeItem('eris_session');
      setSession(null);
      collectData();
    } catch (err) {
      console.warn('Failed to clear session:', err);
    }
  };

  // Copy to clipboard helper
  const handleCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(identifier);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-out panel */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-[#0a0c14] border-l border-white/10 shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0e111a]">
          <div className="flex items-center gap-2.5">
            <Database className="size-5 text-amber-400" />
            <h2 className="text-base font-semibold text-white tracking-tight">Developer Inspector</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={collectData}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Global Dev Mode Switcher in Inspector */}
        <div className="px-5 py-3 border-b border-white/10 bg-[#121522] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white">Dev Mode State</span>
            <span className="text-xs text-neutral-400">Controls bypasses and inspector visibility</span>
          </div>

          <button
            type="button"
            onClick={() => setDevMode(!isDevMode)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all cursor-pointer border',
              isDevMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                : 'bg-neutral-800 text-neutral-400 border-white/10 hover:text-white'
            )}
          >
            {isDevMode ? 'Dev Mode: ACTIVE' : 'Dev Mode: OFF'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 bg-[#0e111a]">
          {[
            { id: 'storage' as const, label: 'Local Storage', icon: Key },
            { id: 'backend' as const, label: 'Backend Health', icon: Shield },
            { id: 'db' as const, label: 'Database Stats', icon: Database },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-all cursor-pointer border-b-2',
                activeTab === tab.id
                  ? 'text-amber-400 border-amber-400 bg-amber-400/5'
                  : 'text-neutral-400 hover:text-white border-transparent'
              )}
            >
              <tab.icon className="size-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 text-neutral-400 text-xs">
                <RefreshCw className="size-3.5 animate-spin text-amber-400" />
                <span>Reading local telemetry records...</span>
              </div>
              <SkeletonTemplate className="h-20 w-full rounded-xl bg-white/5" />
              <SkeletonTemplate className="h-16 w-full rounded-xl bg-white/5" />
              <SkeletonTemplate className="h-32 w-full rounded-xl bg-white/5" />
            </div>
          ) : (
            <>
              {/* ═══ TAB 1: Storage & Session ═══ */}
              {activeTab === 'storage' && (
                <div className="space-y-4">
                  {/* Execution Mode Profile (Speed vs Accuracy) */}
                  <div className="p-4 rounded-xl border border-white/10 bg-[#0e111a] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="size-4 text-amber-400" />
                        <span className="text-sm font-semibold text-white">Execution Mode (Dev)</span>
                      </div>
                      <div className="flex items-center gap-1.5 p-0.5 rounded-lg border border-white/10 bg-black/40 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setDevExecutionMode('speed');
                            fetch('/api/system/execution-mode', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ mode: 'speed' }),
                            }).catch(() => {});
                          }}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors',
                            devExecutionMode === 'speed' ? 'bg-amber-500 text-black shadow-xs' : 'text-neutral-400 hover:text-white'
                          )}
                        >
                          Speed
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDevExecutionMode('accuracy');
                            fetch('/api/system/execution-mode', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ mode: 'accuracy' }),
                            }).catch(() => {});
                          }}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors',
                            devExecutionMode === 'accuracy' ? 'bg-indigo-600 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                          )}
                        >
                          Accuracy
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Speed: Rapid direct inference for day-to-day tasks. Accuracy: Deep multi-turn reasoning loops.
                    </p>
                  </div>

                  {/* Active Session Management */}
                  <div className="p-4 rounded-xl border border-white/10 bg-[#0e111a] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-violet-400" />
                        <span className="text-sm font-semibold text-white">Active Session</span>
                      </div>
                      {session && (
                        <button
                          onClick={handleClearSession}
                          className="px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Clear Session
                        </button>
                      )}
                    </div>

                    {session ? (
                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-neutral-400">Email:</span>
                          <span className="text-white font-medium">{session.email}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-neutral-400">Display Name:</span>
                          <span className="text-white">{session.displayName || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-neutral-400">Token:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-neutral-300 truncate max-w-[140px]">
                              {session.token}
                            </span>
                            <button
                              onClick={() => handleCopy(session.token || '', 'token')}
                              className="text-neutral-400 hover:text-white cursor-pointer"
                              title="Copy Token"
                            >
                              {copiedKey === 'token' ? (
                                <Check className="size-3 text-emerald-400" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400">No active authenticated session.</p>
                    )}
                  </div>

                  {/* Local Storage Keys */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">
                        Storage Keys ({keys.length})
                      </span>
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/15 bg-white/5 text-white hover:bg-white/10 text-xs font-medium cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                        <span>Add Key</span>
                      </button>
                    </div>

                    {showAddModal && (
                      <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                        <input
                          placeholder="Key name (e.g. eris_test)"
                          value={newKey}
                          onChange={(e) => setNewKey(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg bg-black border border-white/15 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400 font-mono"
                        />
                        <textarea
                          placeholder="Value"
                          value={newValue}
                          onChange={(e) => setNewValue(e.target.value)}
                          rows={2}
                          className="w-full p-2.5 rounded-lg bg-black border border-white/15 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400 font-mono"
                        />
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => setShowAddModal(false)}
                            className="px-2.5 py-1 text-xs text-neutral-400 hover:text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleAddKey}
                            className="px-3 py-1 bg-amber-500 text-black font-semibold rounded-lg text-xs hover:bg-amber-400 cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {keys.map((item) => (
                        <div
                          key={item.key}
                          className="p-3 rounded-xl border border-white/10 bg-[#0e111a] space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-semibold text-amber-400">
                              {item.key}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleCopy(item.value, item.key)}
                                className="p-1 rounded text-neutral-400 hover:text-white cursor-pointer"
                                title="Copy Value"
                              >
                                {copiedKey === item.key ? (
                                  <Check className="size-3 text-emerald-400" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingKey(item.key);
                                  setEditValue(item.value);
                                }}
                                className="p-1 rounded text-neutral-400 hover:text-white cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="size-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteKey(item.key)}
                                className="p-1 rounded text-neutral-400 hover:text-rose-400 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          </div>

                          {editingKey === item.key ? (
                            <div className="space-y-2 pt-1">
                              <textarea
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                rows={3}
                                className="w-full p-2 rounded-lg bg-black border border-white/20 text-xs text-white font-mono"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setEditingKey(null)}
                                  className="px-2 py-0.5 text-xs text-neutral-400 hover:text-white cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveEdit(item.key)}
                                  className="px-2.5 py-0.5 bg-amber-500 text-black font-semibold rounded text-xs hover:bg-amber-400 cursor-pointer"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap break-all leading-relaxed max-h-24 overflow-y-auto bg-black/50 p-2 rounded-lg">
                              {item.value}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ TAB 2: Backend Health ═══ */}
              {activeTab === 'backend' && (
                <div className="space-y-3">
                  {health ? (
                    <>
                      <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                        <span className="size-2 rounded-full bg-emerald-400" />
                        <span className="text-xs font-mono font-semibold text-emerald-300 uppercase">
                          System Status: {health.status}
                        </span>
                      </div>

                      {Object.entries(health.subsystems).map(([k, sub]) => (
                        <div
                          key={k}
                          className="p-3.5 rounded-xl border border-white/10 bg-[#0e111a] space-y-1.5 text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-white">{sub.name}</span>
                            <BadgeTemplate
                              variant={sub.status === 'online' ? 'success' : 'destructive'}
                              className="text-xs uppercase font-mono px-2 py-0.5"
                            >
                              {sub.status}
                            </BadgeTemplate>
                          </div>
                          <div className="text-xs font-mono text-neutral-400 space-y-0.5">
                            <div>Target: {sub.target}</div>
                            {sub.database && <div>Database: {sub.database}</div>}
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-12 text-neutral-400 text-sm">
                      Backend unreachable on port 5174
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TAB 3: Database Records ═══ */}
              {activeTab === 'db' && (
                <div className="space-y-4">
                  {resetStatus && (
                    <div className={cn(
                      "p-3 rounded-xl border text-xs font-mono flex items-center justify-between",
                      resetStatus.startsWith('✓')
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-300"
                    )}>
                      <span>{resetStatus}</span>
                      <button onClick={() => setResetStatus(null)} className="text-neutral-400 hover:text-white cursor-pointer ml-2">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Dev Credentials Explainer Card */}
                  <div className="p-3.5 rounded-xl border border-violet-500/30 bg-violet-500/10 space-y-2 text-left">
                    <div className="flex items-center gap-2">
                      <KeyRound className="size-4 text-violet-400" />
                      <span className="text-xs font-semibold text-violet-200">
                        Local Dev Account & Password Quick-Access
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-300 leading-relaxed font-sans">
                      <strong className="text-white">Why "already registered" vs "wrong pass"?</strong> In SQLite (<code className="text-violet-300">auth.db</code>), verified accounts block re-signup. If a password entered previously does not match, login fails. Use the 1-click reset buttons below to instantly set any password in development.
                    </p>
                    <div className="pt-1.5 flex flex-wrap items-center gap-2 text-xs font-mono">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 text-neutral-300">
                        <span className="text-neutral-500">Email:</span>
                        <span className="text-white font-medium">{stats?.users?.[0]?.email || session?.email || 'dev@eris.local'}</span>
                        <button
                          onClick={() => handleCopy(stats?.users?.[0]?.email || session?.email || 'dev@eris.local', 'dev_email')}
                          className="ml-1 text-neutral-400 hover:text-white cursor-pointer"
                          title="Copy Email"
                        >
                          {copiedKey === 'dev_email' ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 text-neutral-300">
                        <span className="text-neutral-500">Pass:</span>
                        <span className="text-emerald-400 font-semibold">password123</span>
                        <button
                          onClick={() => handleCopy('password123', 'dev_pass')}
                          className="ml-1 text-neutral-400 hover:text-white cursor-pointer"
                          title="Copy Password"
                        >
                          {copiedKey === 'dev_pass' ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {stats ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Registered Users', value: stats.user_count },
                          { label: 'Active Sessions', value: stats.session_count },
                          { label: 'Issued OTPs', value: stats.otp_count },
                          { label: 'Audit Logs', value: stats.audit_log_count },
                        ].map((s) => (
                          <div
                            key={s.label}
                            className="p-3 rounded-xl border border-white/10 bg-[#0e111a] flex flex-col"
                          >
                            <span className="text-xs text-neutral-400 font-sans">{s.label}</span>
                            <span className="text-lg font-bold text-white font-mono mt-1">
                              {s.value}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Registered Users List */}
                      {stats.users && stats.users.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-white">
                              Database Accounts ({stats.users.length})
                            </span>
                            <span className="text-xs text-neutral-500 font-mono">SQLite (auth.db)</span>
                          </div>
                          <div className="space-y-3">
                            {stats.users.map((u) => (
                              <div
                                key={u.id}
                                className="p-3.5 rounded-xl border border-white/10 bg-[#0e111a] flex flex-col gap-3 text-left"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono font-bold text-white">
                                        {u.email}
                                      </span>
                                      <button
                                        onClick={() => handleCopy(u.email, `usr_em_${u.id}`)}
                                        className="text-neutral-500 hover:text-white cursor-pointer"
                                        title="Copy Email"
                                      >
                                        {copiedKey === `usr_em_${u.id}` ? (
                                          <Check className="size-3 text-emerald-400" />
                                        ) : (
                                          <Copy className="size-3" />
                                        )}
                                      </button>
                                    </div>
                                    <span className="text-xs text-neutral-400 mt-0.5">
                                      {u.display_name} • Role: <span className="font-mono text-neutral-300">{u.role}</span>
                                    </span>
                                    <span className="text-[11px] font-mono text-neutral-500 mt-0.5 break-all">
                                      ID: {u.id}
                                    </span>
                                  </div>
                                  <BadgeTemplate
                                    variant={u.is_verified ? 'success' : 'secondary'}
                                    className="text-xs font-mono font-medium whitespace-nowrap"
                                  >
                                    {u.is_verified ? 'Verified' : 'Unverified'}
                                  </BadgeTemplate>
                                </div>

                                {/* Dev Password Reset Controls */}
                                <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-2">
                                  <button
                                    onClick={() => handleDevResetPassword(u.email, 'password123')}
                                    className="px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5"
                                    title="Instantly sets password to password123"
                                  >
                                    <RotateCcw className="size-3" />
                                    <span>Reset to password123</span>
                                  </button>

                                  <button
                                    onClick={() => setResettingUser(resettingUser === u.email ? null : u.email)}
                                    className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10 text-xs font-medium cursor-pointer transition-colors"
                                  >
                                    {resettingUser === u.email ? 'Cancel' : 'Set Custom Password...'}
                                  </button>
                                </div>

                                {resettingUser === u.email && (
                                  <div className="pt-2 flex items-center gap-2 animate-in fade-in duration-150">
                                    <input
                                      type="text"
                                      value={customPassword}
                                      onChange={(e) => setCustomPassword(e.target.value)}
                                      placeholder="New password..."
                                      className="flex-1 px-2.5 py-1 rounded-lg bg-black border border-white/20 text-xs text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-amber-400"
                                    />
                                    <button
                                      onClick={() => {
                                        if (customPassword.trim()) {
                                          handleDevResetPassword(u.email, customPassword.trim());
                                          setResettingUser(null);
                                        }
                                      }}
                                      className="px-3 py-1 bg-amber-500 text-black font-semibold rounded-lg text-xs hover:bg-amber-400 cursor-pointer"
                                    >
                                      Save Pass
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-neutral-400 text-sm">
                      Backend unreachable — database records unavailable
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default DevDataViewer;
