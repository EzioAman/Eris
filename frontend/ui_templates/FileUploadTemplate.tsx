import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Trash2,
  AlertCircle,
  RotateCcw,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '../src/lib/utils';

export interface UploadedFileItem {
  id: string;
  name: string;
  sizeBytes: number;
  progress: number; // 0 to 100
  status: 'uploading' | 'completed' | 'error';
  type?: string;
  errorMessage?: string;
}

export interface FileUploadTemplateProps {
  onFilesSelected?: (files: File[]) => void;
  onFileRemoved?: (fileId: string) => void;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  isDarkMode?: boolean;
  isDisabled?: boolean;
  mode?: 'progress-fill' | 'progress-bar';
  hint?: string;
  className?: string;
  initialFiles?: UploadedFileItem[];
}

export const FileUploadTemplate: React.FC<FileUploadTemplateProps> = ({
  onFilesSelected,
  onFileRemoved,
  maxSizeMB = 25,
  acceptedFormats = ['PNG', 'JPG', 'PDF', 'DOCX', 'TXT', 'JSON', 'PY', 'TS'],
  isDarkMode = true,
  isDisabled = false,
  mode = 'progress-fill',
  hint,
  className,
  initialFiles = [],
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadedFileItem[]>(initialFiles);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number): string => {
    if (bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext)) {
      return <ImageIcon className="w-4 h-4 text-violet-400" />;
    }
    if (['ts', 'tsx', 'js', 'jsx', 'py', 'json', 'html', 'css', 'sql'].includes(ext)) {
      return <FileCode className="w-4 h-4 text-cyan-400" />;
    }
    if (['csv', 'xlsx', 'xls'].includes(ext)) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    }
    if (['zip', 'tar', 'gz', 'rar'].includes(ext)) {
      return <FileArchive className="w-4 h-4 text-amber-400" />;
    }
    return <FileText className="w-4 h-4 text-blue-400" />;
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isDisabled) return;
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const simulateProgress = (fileId: string) => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 20) + 15;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, progress: 100, status: 'completed' } : f
          )
        );
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, progress: current, status: 'uploading' } : f
          )
        );
      }
    }, 120);
  };

  const processFiles = (newFiles: File[]) => {
    if (isDisabled) return;
    onFilesSelected?.(newFiles);

    const mapped: UploadedFileItem[] = newFiles.map((f) => {
      const id = crypto.randomUUID();
      const isTooLarge = f.size > maxSizeMB * 1024 * 1024;
      return {
        id,
        name: f.name,
        sizeBytes: f.size,
        progress: isTooLarge ? 0 : 15,
        status: isTooLarge ? 'error' : 'uploading',
        errorMessage: isTooLarge ? `File exceeds ${maxSizeMB}MB limit` : undefined,
      };
    });

    setFiles((prev) => [...mapped, ...prev]);

    // Animate progress fill for non-error uploads
    mapped.forEach((item) => {
      if (item.status === 'uploading') {
        simulateProgress(item.id);
      }
    });
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    onFileRemoved?.(id);
  };

  const retryUpload = (id: string) => {
    if (isDisabled) return;
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, progress: 10, status: 'uploading', errorMessage: undefined } : f
      )
    );
    simulateProgress(id);
  };

  return (
    <div className={cn('w-full font-sans space-y-4 select-none', className)}>
      {/* ─── Untitled UI DropZone ─── */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!isDisabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        onClick={() => {
          if (!isDisabled) inputRef.current?.click();
        }}
        className={cn(
          'relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all text-center',
          isDisabled
            ? isDarkMode
              ? 'border-neutral-800/80 bg-white/[0.02] opacity-50 cursor-not-allowed pointer-events-none'
              : 'border-slate-200 bg-slate-50/70 opacity-60 cursor-not-allowed pointer-events-none'
            : isDragging
            ? isDarkMode
              ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10 scale-[1.005]'
              : 'border-blue-500 bg-blue-50 shadow-md'
            : isDarkMode
            ? 'border-white/10 hover:border-white/20 bg-[#0A0D14]/80 hover:bg-[#0D111A] cursor-pointer'
            : 'border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-50 cursor-pointer'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          disabled={isDisabled}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && !isDisabled) {
              processFiles(Array.from(e.target.files));
            }
          }}
        />

        {/* Featured Upload Icon */}
        <div
          className={cn(
            'p-3.5 rounded-full mb-3.5 transition-transform duration-200 shadow-xs',
            isDisabled
              ? isDarkMode
                ? 'bg-white/5 text-neutral-500 border border-white/5'
                : 'bg-slate-100 text-slate-400 border border-slate-200'
              : isDarkMode
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-105'
              : 'bg-blue-50 text-blue-600 border border-blue-100'
          )}
        >
          <UploadCloud className="w-6 h-6 stroke-[1.8]" />
        </div>

        {/* Upload Description */}
        <p className="text-sm font-semibold mb-1">
          {isDisabled ? (
            <span className={isDarkMode ? 'text-neutral-400' : 'text-slate-500'}>
              File upload disabled
            </span>
          ) : (
            <>
              <span className="text-blue-600 dark:text-blue-400 underline-offset-2 hover:underline">
                Click to upload
              </span>{' '}
              <span className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>
                or drag and drop
              </span>
            </>
          )}
        </p>

        {/* Supported Formats / Hint */}
        <p className={cn('text-xs mt-0.5', isDarkMode ? 'text-neutral-400' : 'text-slate-500')}>
          {hint || `${acceptedFormats.join(', ')} (max. ${maxSizeMB}MB)`}
        </p>

        {isDisabled && (
          <span
            className={cn(
              'mt-3 text-[11px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider font-semibold',
              isDarkMode
                ? 'border-white/10 bg-white/5 text-neutral-400'
                : 'border-slate-200 bg-slate-100 text-slate-500'
            )}
          >
            Disabled
          </span>
        )}
      </div>

      {/* ─── Untitled UI Progress Fill List ─── */}
      {files.length > 0 && (
        <div className="space-y-2.5">
          {files.map((file) => {
            const isError = file.status === 'error';
            const isDone = file.status === 'completed';

            return (
              <div
                key={file.id}
                className={cn(
                  'relative overflow-hidden rounded-xl border p-3.5 transition-all select-none',
                  isDarkMode
                    ? 'border-white/10 bg-[#0E131F]/90 shadow-sm'
                    : 'border-slate-200 bg-white shadow-xs',
                  isError && (isDarkMode ? 'border-rose-500/30' : 'border-rose-200')
                )}
              >
                {/* ─── Progress Fill Overlay ─── */}
                {mode === 'progress-fill' && !isError && (
                  <div
                    className={cn(
                      'absolute inset-y-0 left-0 transition-all duration-300 ease-out pointer-events-none rounded-xl',
                      isDone
                        ? isDarkMode
                          ? 'bg-emerald-500/10'
                          : 'bg-emerald-50/60'
                        : isDarkMode
                        ? 'bg-blue-600/15 border-r border-blue-500/30'
                        : 'bg-blue-50 border-r border-blue-200'
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, file.progress))}%` }}
                  />
                )}

                {/* Content Row */}
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={cn(
                        'p-2.5 rounded-lg shrink-0 border',
                        isDarkMode
                          ? 'bg-white/5 border-white/10'
                          : 'bg-slate-50 border-slate-200'
                      )}
                    >
                      {getFileIcon(file.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold truncate leading-tight">
                          {file.name}
                        </p>
                        {isDone && (
                          <span
                            className={cn(
                              'text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold',
                              isDarkMode
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-emerald-100 text-emerald-800'
                            )}
                          >
                            100%
                          </span>
                        )}
                        {!isDone && !isError && (
                          <span className="text-[10px] font-mono text-blue-400 font-semibold">
                            {file.progress}%
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={cn(
                            'text-[11px] font-mono',
                            isDarkMode ? 'text-neutral-400' : 'text-slate-500'
                          )}
                        >
                          {formatSize(file.sizeBytes)}
                        </span>

                        {isError ? (
                          <span className="text-[11px] font-medium text-rose-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {file.errorMessage || 'Upload failed'}
                          </span>
                        ) : isDone ? (
                          <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-blue-400">
                            Uploading...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isError && (
                      <button
                        type="button"
                        onClick={() => retryUpload(file.id)}
                        title="Retry upload"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      title="Remove file"
                      className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Optional Linear Progress Bar (if mode="progress-bar") */}
                {mode === 'progress-bar' && !isDone && !isError && (
                  <div className="mt-2.5 w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FileUploadTemplate;
