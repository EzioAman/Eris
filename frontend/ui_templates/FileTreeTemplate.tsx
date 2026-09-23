import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '../src/lib/utils';
import {
  ChevronRight,
  Folder as FolderIcon,
  FolderOpen,
  File as FileIcon,
  FileCode2,
  Image as ImageIcon,
  TerminalSquare,
  FileText,
} from 'lucide-react';

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  isExpanded?: boolean;
}

// ─── Magic UI File Tree Context ───
interface TreeContextType {
  selectedId: string | null;
  selectItem: (id: string, node: FileNode) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  isDarkMode?: boolean;
}

const TreeContext = createContext<TreeContextType | null>(null);

const useTree = () => {
  const context = useContext(TreeContext);
  if (!context) throw new Error('useTree must be used within a Tree component');
  return context;
};

// ─── Tree Root ───
export interface TreeProps {
  children: React.ReactNode;
  initialSelectedId?: string;
  initialExpandedIds?: string[];
  onSelect?: (id: string, node: FileNode) => void;
  isDarkMode?: boolean;
  className?: string;
}

export const Tree: React.FC<TreeProps> = ({
  children,
  initialSelectedId = null,
  initialExpandedIds = [],
  onSelect,
  isDarkMode = true,
  className,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(initialExpandedIds));

  const selectItem = useCallback((id: string, node: FileNode) => {
    setSelectedId(id);
    onSelect?.(id, node);
  }, [onSelect]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    // handled by root when provided all IDs
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  return (
    <TreeContext.Provider
      value={{
        selectedId,
        selectItem,
        expandedIds,
        toggleExpand,
        expandAll,
        collapseAll,
        isDarkMode,
      }}
    >
      <div
        className={cn(
          'w-full font-mono text-xs select-none space-y-0.5',
          isDarkMode ? 'text-neutral-300' : 'text-slate-700',
          className
        )}
      >
        {children}
      </div>
    </TreeContext.Provider>
  );
};

// ─── Folder Item ───
export interface FolderProps {
  id: string;
  name: string;
  children?: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export const Folder: React.FC<FolderProps> = ({
  id,
  name,
  children,
  defaultExpanded: _defaultExpanded,
  className,
}) => {
  const { expandedIds, toggleExpand, isDarkMode } = useTree();
  const isExpanded = expandedIds.has(id);

  return (
    <div className={cn('w-full', className)}>
      <button
        type="button"
        onClick={() => toggleExpand(id)}
        className={cn(
          'w-full flex items-center gap-1.5 py-1 px-2 rounded-lg transition-colors cursor-pointer text-left',
          isDarkMode
            ? 'hover:bg-white/5 hover:text-white'
            : 'hover:bg-slate-100 hover:text-slate-900'
        )}
      >
        <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
          <ChevronRight
            className={cn(
              'w-3 h-3 transition-transform duration-200',
              isExpanded && 'rotate-90',
              isDarkMode ? 'text-neutral-400' : 'text-slate-400'
            )}
          />
        </span>
        {isExpanded ? (
          <FolderOpen className={cn('w-3.5 h-3.5 shrink-0', isDarkMode ? 'text-amber-400' : 'text-blue-500')} />
        ) : (
          <FolderIcon className={cn('w-3.5 h-3.5 shrink-0', isDarkMode ? 'text-amber-400/80' : 'text-blue-500/80')} />
        )}
        <span className="truncate font-medium">{name}</span>
      </button>

      {isExpanded && children && (
        <div className={cn(
          'pl-4 border-l ml-3.5 space-y-0.5 mt-0.5',
          isDarkMode ? 'border-white/10' : 'border-slate-200'
        )}>
          {children}
        </div>
      )}
    </div>
  );
};

// ─── File Item ───
export interface FileProps {
  id: string;
  name: string;
  className?: string;
  onClick?: () => void;
}

const getFileIcon = (name: string, isDarkMode: boolean) => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || ''))
    return <ImageIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
  if (['ts', 'tsx', 'js', 'jsx', 'json'].includes(ext || ''))
    return <FileCode2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  if (['sh', 'cmd', 'bat', 'ps1'].includes(ext || ''))
    return <TerminalSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  if (['md', 'txt', 'rtf'].includes(ext || ''))
    return <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
  return <FileIcon className={cn('w-3.5 h-3.5 shrink-0', isDarkMode ? 'text-neutral-400' : 'text-slate-400')} />;
};

export const File: React.FC<FileProps> = ({ id, name, className, onClick }) => {
  const { selectedId, selectItem, isDarkMode } = useTree();
  const isSelected = selectedId === id;

  const handleClick = () => {
    selectItem(id, { id, name, type: 'file' });
    onClick?.();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'w-full flex items-center gap-2 py-1 px-2 rounded-lg transition-colors cursor-pointer text-left',
        isSelected
          ? isDarkMode
            ? 'bg-amber-400/15 text-amber-300 font-semibold'
            : 'bg-blue-50 text-blue-700 font-semibold'
          : isDarkMode
          ? 'hover:bg-white/5 hover:text-white text-neutral-300'
          : 'hover:bg-slate-100 hover:text-slate-900 text-slate-600',
        className
      )}
    >
      <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
        {getFileIcon(name, !!isDarkMode)}
      </span>
      <span className="truncate">{name}</span>
    </button>
  );
};

// ─── High-Level Template Component ───
export interface FileTreeTemplateProps {
  data: FileNode[];
  onFileSelect?: (node: FileNode) => void;
  selectedPath?: string;
  isDarkMode?: boolean;
  className?: string;
}

export const FileTreeTemplate: React.FC<FileTreeTemplateProps> = ({
  data,
  onFileSelect,
  isDarkMode = true,
  className,
}) => {
  // Recursively collect all folder IDs where isExpanded is true
  const initialExpandedIds = React.useMemo(() => {
    const ids: string[] = [];
    const traverse = (list: FileNode[]) => {
      for (const item of list) {
        if (item.type === 'folder') {
          if (item.isExpanded) ids.push(item.id);
          if (item.children) traverse(item.children);
        }
      }
    };
    traverse(data);
    return ids;
  }, [data]);

  const renderNode = (node: FileNode) => {
    if (node.type === 'folder') {
      return (
        <Folder
          key={node.id}
          id={node.id}
          name={node.name}
          defaultExpanded={node.isExpanded ?? false}
        >
          {node.children?.map(renderNode)}
        </Folder>
      );
    }
    return (
      <File
        key={node.id}
        id={node.id}
        name={node.name}
        onClick={() => onFileSelect?.(node)}
      />
    );
  };

  return (
    <div
      className={cn(
        'p-2.5 rounded-xl border overflow-y-auto max-h-[350px] shadow-sm transition-colors',
        isDarkMode
          ? 'bg-[#0F131D]/90 border-white/10'
          : 'bg-slate-50/90 border-slate-200',
        className
      )}
    >
      <Tree
        isDarkMode={isDarkMode}
        initialExpandedIds={initialExpandedIds}
      >
        {data.map(renderNode)}
      </Tree>
    </div>
  );
};

export default FileTreeTemplate;
