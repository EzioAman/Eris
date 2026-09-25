import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  DownloadCloud,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../src/lib/utils';

export interface UpdateInfo {
  ok: boolean;
  current_version: string;
  latest_version: string;
  update_available: boolean;
  release_url: string;
  release_name: string;
  download_url?: string;
  size_bytes?: number;
  changelog?: string[];
  published_at?: string;
}

export interface UpdateCheckerNotificationProps {
  isDarkMode?: boolean;
  onDismiss?: () => void;
  className?: string;
  compact?: boolean; // For header notification popover
  onOpenPatchNotes?: () => void;
}

export const UpdateCheckerNotificationTemplate: React.FC<UpdateCheckerNotificationProps> = ({
  isDarkMode = true,
  onDismiss,
  className,
  compact = false,
  onOpenPatchNotes,
}) => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [isReadyToInstall, setIsReadyToInstall] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  // Poll update status from backend
  const checkUpdate = useCallback(async () => {
    setIsChecking(true);
    setInstallError(null);
    try {
      const res = await fetch('/api/system/check-update');
      if (res.ok) {
        const data: UpdateInfo = await res.json();
        setUpdateInfo(data);
      }
    } catch {
      // Offline fallback: non-critical
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkUpdate();
  }, [checkUpdate]);

  // Monitor background download progress
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isDownloading) {
      interval = setInterval(async () => {
        try {
          const res = await fetch('/api/system/update-progress');
          if (res.ok) {
            const data = await res.json();
            setDownloadProgress(data.progress_percent || 0);
            setDownloadedBytes(data.downloaded_bytes || 0);
            setTotalBytes(data.total_bytes || 0);

            if (data.status === 'ready') {
              setIsDownloading(false);
              setIsReadyToInstall(true);
            } else if (data.status === 'error') {
              setIsDownloading(false);
              setInstallError(data.error_message || 'Failed to download update.');
            }
          }
        } catch {
          // ignore transient poll failure
        }
      }, 750);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDownloading]);

  const handleStartDownload = async () => {
    if (!updateInfo) return;
    setIsDownloading(true);
    setInstallError(null);
    try {
      const downloadUrl =
        updateInfo.download_url ||
        'https://github.com/EzioAman/ERIS/releases/download/v0.1.1-beta/ERIS.Setup.0.1.1-beta.exe';

      await fetch('/api/system/download-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ download_url: downloadUrl }),
      });
    } catch (err: unknown) {
      setIsDownloading(false);
      setInstallError(err instanceof Error ? err.message : 'Could not reach update server.');
    }
  };

  const handleApplyUpdate = async () => {
    try {
      await fetch('/api/system/apply-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ silent: true }),
      });
    } catch (err: unknown) {
      setInstallError(err instanceof Error ? err.message : 'Error executing installer.');
    }
  };

  if (!updateInfo && !isChecking) return null;

  const hasUpdate = updateInfo?.update_available;
  const currentVer = updateInfo?.current_version || '0.1.1-beta';
  const latestVer = updateInfo?.latest_version || currentVer;
  const sizeMb = updateInfo?.size_bytes
    ? (updateInfo.size_bytes / (1024 * 1024)).toFixed(1)
    : '246.2';

  return (
    <div
      role="alert"
      className={cn(
        'relative rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-300 font-sans',
        compact ? 'p-3 max-w-sm' : 'p-4 max-w-md w-full',
        isDarkMode
          ? 'bg-neutral-900/95 border-white/10 text-white shadow-black/40'
          : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-200/80',
        hasUpdate
          ? isDarkMode
            ? 'ring-1 ring-indigo-500/30'
            : 'ring-1 ring-indigo-500/20'
          : '',
        className
      )}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'size-8 rounded-xl flex items-center justify-center shrink-0 transition-colors',
              hasUpdate
                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25'
                : isReadyToInstall
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
            )}
          >
            {isDownloading ? (
              <RefreshCw className="size-4 animate-spin text-indigo-400" />
            ) : isReadyToInstall ? (
              <CheckCircle2 className="size-4 text-emerald-400" />
            ) : hasUpdate ? (
              <Sparkles className="size-4 text-indigo-400" />
            ) : (
              <CheckCircle2 className="size-4 text-emerald-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-tight leading-none">
                {isDownloading
                  ? 'Downloading ERIS Update'
                  : isReadyToInstall
                  ? 'Update Ready to Install'
                  : hasUpdate
                  ? 'Update Available'
                  : 'ERIS Up to Date'}
              </span>
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-md text-[11px] font-medium leading-none',
                  hasUpdate
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                )}
              >
                v{latestVer}
              </span>
            </div>
            <p
              className={cn(
                'text-xs mt-1 leading-snug',
                isDarkMode ? 'text-neutral-400' : 'text-slate-500'
              )}
            >
              {isDownloading
                ? `Downloading installer assets (${downloadProgress}% completed)...`
                : isReadyToInstall
                ? 'All packages verified. Restart to apply updates cleanly.'
                : hasUpdate
                ? `ERIS v${latestVer} is ready. Windows stability & resilient stream updates (~${sizeMb} MB).`
                : `You are on the latest build (v${currentVer}).`}
            </p>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className={cn(
              'cursor-pointer size-6 rounded-lg flex items-center justify-center transition-colors shrink-0',
              isDarkMode
                ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            )}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Progress Bar (when downloading) */}
      {isDownloading && (
        <div className="mt-3.5 space-y-1.5">
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(downloadProgress, 4)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
            <span>
              {totalBytes > 0
                ? `${(downloadedBytes / (1024 * 1024)).toFixed(1)} MB / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
                : 'Connecting to download stream...'}
            </span>
            <span>{downloadProgress}%</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {installError && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-lg">
          <AlertCircle className="size-3.5 shrink-0" />
          <span className="truncate">{installError}</span>
        </div>
      )}

      {/* Action Row */}
      <div className="mt-3.5 pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {hasUpdate && !isDownloading && !isReadyToInstall && (
            <button
              type="button"
              onClick={handleStartDownload}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-colors"
            >
              <DownloadCloud className="size-3.5" />
              <span>Update now</span>
            </button>
          )}

          {isReadyToInstall && (
            <button
              type="button"
              onClick={handleApplyUpdate}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-colors"
            >
              <CheckCircle2 className="size-3.5" />
              <span>Restart & Install</span>
            </button>
          )}

          {!hasUpdate && !isDownloading && !isReadyToInstall && (
            <button
              type="button"
              onClick={checkUpdate}
              disabled={isChecking}
              className={cn(
                'cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                isDarkMode
                  ? 'bg-white/5 hover:bg-white/10 text-neutral-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              )}
            >
              <RefreshCw className={cn('size-3.5', isChecking && 'animate-spin')} />
              <span>{isChecking ? 'Checking...' : 'Check again'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onOpenPatchNotes ? (
            <button
              type="button"
              onClick={onOpenPatchNotes}
              className={cn(
                'cursor-pointer inline-flex items-center gap-1 text-xs font-medium transition-colors hover:underline',
                isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              )}
            >
              <span>Patch notes</span>
              <ChevronRight className="size-3" />
            </button>
          ) : updateInfo?.release_url ? (
            <a
              href={updateInfo.release_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium transition-colors hover:underline',
                isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              )}
            >
              <span>Patch notes</span>
              <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default UpdateCheckerNotificationTemplate;
