import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, Trash2 } from 'lucide-react';
import { cn } from '../src/lib/utils';

export interface UploadedFileItem {
  id: string;
  name: string;
  sizeBytes: number;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

export interface FileUploadTemplateProps {
  onFilesSelected?: (files: File[]) => void;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  isDarkMode?: boolean;
  className?: string;
}

export const FileUploadTemplate: React.FC<FileUploadTemplateProps> = ({
  onFilesSelected,
  maxSizeMB = 10,
  acceptedFormats = ['PNG', 'JPG', 'PDF', 'DOCX', 'TXT', 'JSON', 'PY', 'TS'],
  isDarkMode = true,
  className,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const processFiles = (newFiles: File[]) => {
    onFilesSelected?.(newFiles);
    const mapped: UploadedFileItem[] = newFiles.map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      sizeBytes: f.size,
      progress: 100,
      status: 'completed',
    }));
    setFiles((prev) => [...mapped, ...prev]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className={cn('w-full font-sans space-y-3', className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all text-center select-none',
          isDragging
            ? isDarkMode
              ? 'border-blue-400 bg-blue-500/10'
              : 'border-blue-500 bg-blue-50'
            : isDarkMode
            ? 'border-neutral-800 hover:border-neutral-700 bg-[#0F131D]/60 hover:bg-[#0F131D]'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/70 hover:bg-slate-50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              processFiles(Array.from(e.target.files));
            }
          }}
        />
        <div className={cn(
          'p-3 rounded-full mb-3',
          isDarkMode ? 'bg-white/5 text-blue-400 border border-white/10' : 'bg-blue-50 text-blue-600 border border-blue-100'
        )}>
          <UploadCloud className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold mb-1">
          <span className="text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
        </p>
        <p className={cn('text-xs', isDarkMode ? 'text-neutral-400' : 'text-slate-500')}>
          {acceptedFormats.join(', ')} (max. {maxSizeMB}MB per file)
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-xl border transition-colors',
                isDarkMode ? 'border-neutral-800 bg-[#0F131D]/80' : 'border-slate-200 bg-white'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  'p-2 rounded-lg shrink-0',
                  isDarkMode ? 'bg-white/5 text-neutral-300' : 'bg-slate-100 text-slate-600'
                )}>
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <p className={cn('text-[11px]', isDarkMode ? 'text-neutral-400' : 'text-slate-500')}>
                    {formatSize(file.sizeBytes)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {file.status === 'completed' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploadTemplate;
