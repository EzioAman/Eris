import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  Search,
  PanelLeftClose,
  RefreshCw,
  FolderSync,
  HardDrive,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { FileTreeTemplate, type FileNode } from '../../../ui_templates/FileTreeTemplate';

export interface WorkspaceTreePanelProps {
  isDarkMode: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSelectFile?: (file: FileNode) => void;
  width?: number;
}

export const WorkspaceTreePanel: React.FC<WorkspaceTreePanelProps> = ({
  isDarkMode,
  isOpen,
  onClose,
  onSelectFile,
  width,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<string>(() => {
    try {
      return localStorage.getItem('eris_workspace_location') || '';
    } catch {
      return '';
    }
  });
  const [inputLocation, setInputLocation] = useState('');
  const [isChangingLocation, setIsChangingLocation] = useState(false);
  const [recentLocations, setRecentLocations] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('eris_recent_workspaces');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [filterQuery, setFilterQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [treeData, setTreeData] = useState<FileNode[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTree = useCallback(
    async (rootPath?: string) => {
      const targetRoot = rootPath !== undefined ? rootPath : selectedLocation;

      try {
        setIsLoading(true);
        setErrorMsg(null);
        const url = targetRoot
          ? `/api/workspace/tree?root=${encodeURIComponent(targetRoot)}`
          : `/api/workspace/tree`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.tree)) {
            if (!selectedLocation && data.root) {
              setSelectedLocation(data.root);
              try {
                localStorage.setItem('eris_workspace_location', data.root);
              } catch {}
            }
            const mapNode = (n: any, idx: number): FileNode => ({
              id: n.path || `${n.name}-${idx}`,
              name: n.name,
              type: n.is_dir ? 'folder' : 'file',
              isExpanded: idx < 2,
              children: n.children ? n.children.map((c: any, cIdx: number) => mapNode(c, cIdx)) : undefined,
            });
            setTreeData(data.tree.map((node: any, i: number) => mapNode(node, i)));
          } else {
            setTreeData([]);
          }
        } else {
          const err = await res.json().catch(() => ({}));
          setErrorMsg(err.detail || 'Unable to open workspace folder');
          setTreeData([]);
        }
      } catch {
        setErrorMsg('Failed to connect to workspace service');
        setTreeData([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedLocation]
  );

  useEffect(() => {
    if (isOpen) {
      fetchTree(selectedLocation || undefined);
    }
  }, [isOpen, selectedLocation, fetchTree]);

  if (!isOpen) return null;

  const handleOpenLocation = (path: string) => {
    const clean = path.trim();
    if (!clean) return;

    setSelectedLocation(clean);
    setIsChangingLocation(false);
    try {
      localStorage.setItem('eris_workspace_location', clean);
      const updated = [clean, ...recentLocations.filter((p) => p !== clean)].slice(0, 5);
      setRecentLocations(updated);
      localStorage.setItem('eris_recent_workspaces', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save workspace location:', e);
    }
    fetchTree(clean);
  };

  const handleBrowseFolder = async () => {
    // 1. Electron Native Dialog
    const win = window as unknown as {
      electronAPI?: { openDirectory?: () => Promise<string | null> };
    };
    if (win.electronAPI?.openDirectory) {
      try {
        const folder = await win.electronAPI.openDirectory();
        if (folder) {
          handleOpenLocation(folder);
          return;
        }
      } catch (err) {
        console.warn('Native electron openDirectory failed:', err);
      }
    }

    // 2. Backend OS Folder Dialog
    try {
      const res = await fetch('/api/workspace/browse', { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.path) {
        handleOpenLocation(data.path);
        return;
      }
    } catch (err) {
      console.warn('Backend /api/workspace/browse failed:', err);
    }

    // 3. Browser File System Access API fallback
    if ('showDirectoryPicker' in window) {
      try {
        const handle = await (window as any).showDirectoryPicker();
        if (handle?.name) {
          handleOpenLocation(handle.name);
        }
      } catch {}
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTree();
  };

  const folderBaseName = selectedLocation
    ? selectedLocation.split(/[/\\]/).filter(Boolean).pop() || selectedLocation
    : '';

  // Filter files recursively
  const displayedFiles = useMemo(() => {
    if (!filterQuery.trim()) return treeData;
    const q = filterQuery.toLowerCase();

    function filterNodes(nodes: FileNode[]): FileNode[] {
      return nodes.reduce((acc: FileNode[], node) => {
        const matchesName = node.name.toLowerCase().includes(q);
        const filteredChildren = node.children ? filterNodes(node.children) : [];
        if (matchesName || filteredChildren.length > 0) {
          acc.push({
            ...node,
            isExpanded: true,
            children: filteredChildren.length > 0 ? filteredChildren : node.children,
          });
        }
        return acc;
      }, []);
    }

    return filterNodes(treeData);
  }, [treeData, filterQuery]);

  return (
    <aside
      style={width ? { width } : undefined}
      className={cn(
        'shrink-0 border-r flex flex-col z-20 select-none font-sans transition-colors duration-150',
        width ? '' : 'w-72',
        isDarkMode
          ? 'bg-[#0E121E] border-white/10 text-neutral-200'
          : 'bg-white border-slate-300 text-slate-800 shadow-xs'
      )}
    >
      {/* Panel Header */}
      <div
        className={cn(
          'h-11 px-3 border-b flex items-center justify-between shrink-0',
          isDarkMode ? 'border-white/10' : 'border-slate-300 bg-slate-50'
        )}
      >
        <div className="flex items-center gap-2 min-w-0" title={selectedLocation || 'Workspace Root'}>
          <FolderOpen className={cn('w-4 h-4 shrink-0', isDarkMode ? 'text-amber-400' : 'text-blue-600')} />
          <span
            className={cn(
              'text-xs font-bold uppercase tracking-wider truncate',
              isDarkMode ? 'text-neutral-200' : 'text-slate-800'
            )}
          >
            {folderBaseName || 'Project Workspace'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {selectedLocation && (
            <>
              <button
                type="button"
                onClick={() => setIsChangingLocation((prev) => !prev)}
                title="Change workspace folder"
                className={cn(
                  'p-1 rounded-md transition-colors cursor-pointer',
                  isDarkMode
                    ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                )}
              >
                <FolderSync className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh workspace tree"
                className={cn(
                  'p-1 rounded-md transition-colors cursor-pointer',
                  isDarkMode
                    ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                )}
              >
                <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Hide Workspace Tree"
            className={cn(
              'p-1 rounded-md transition-colors cursor-pointer',
              isDarkMode
                ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            )}
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Choose / Switch Location View */}
      {isChangingLocation ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-left">
          <div className="space-y-1">
            <div className={cn("flex items-center gap-2 text-xs font-bold", isDarkMode ? "text-neutral-200" : "text-slate-900")}>
              <HardDrive className="w-4 h-4 text-cyan-500" />
              <span>Open Working Directory</span>
            </div>
            <p className={cn("text-xs leading-relaxed", isDarkMode ? "text-neutral-400" : "text-slate-600")}>
              Select a project folder on your computer where you want ERIS to operate.
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleBrowseFolder}
              className={cn(
                "w-full h-9 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border shadow-xs",
                isDarkMode
                  ? "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-300"
                  : "bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700"
              )}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Browse Folder...</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className={cn("flex-grow border-t", isDarkMode ? "border-white/10" : "border-slate-300")}></div>
              <span className={cn("flex-shrink mx-2 text-[10px] uppercase font-bold", isDarkMode ? "text-neutral-500" : "text-slate-500")}>or enter path</span>
              <div className={cn("flex-grow border-t", isDarkMode ? "border-white/10" : "border-slate-300")}></div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleOpenLocation(inputLocation);
              }}
              className="space-y-2"
            >
              <input
                type="text"
                placeholder="e.g. E:\Projects\MyProject"
                value={inputLocation}
                onChange={(e) => setInputLocation(e.target.value)}
                className={cn(
                  "w-full h-8 px-2.5 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 border",
                  isDarkMode
                    ? "bg-black/40 border-white/10 text-white placeholder:text-neutral-500"
                    : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-2xs font-medium"
                )}
              />
              <button
                type="submit"
                disabled={!inputLocation.trim()}
                className={cn(
                  "w-full h-8 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40",
                  isDarkMode
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-slate-800 hover:bg-slate-900 text-white shadow-xs"
                )}
              >
                <span>Open Folder</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </form>
          </div>

          {recentLocations.length > 0 && (
            <div className={cn("space-y-1.5 pt-2 border-t", isDarkMode ? "border-white/10" : "border-slate-300")}>
              <div className={cn("flex items-center gap-1.5 text-xs font-semibold", isDarkMode ? "text-neutral-400" : "text-slate-700")}>
                <Clock className="w-3 h-3" />
                <span>Recent Folders</span>
              </div>
              <div className="space-y-1">
                {recentLocations.map((loc) => {
                  const bName = loc.split(/[/\\]/).filter(Boolean).pop() || loc;
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => handleOpenLocation(loc)}
                      className={cn(
                        "w-full text-left p-1.5 rounded-lg text-xs transition-colors flex items-center justify-between group cursor-pointer",
                        isDarkMode
                          ? "hover:bg-white/5 text-neutral-300 hover:text-white"
                          : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                      )}
                      title={loc}
                    >
                      <span className="truncate font-mono text-[11px]">{bName}</span>
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-cyan-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedLocation && (
            <button
              type="button"
              onClick={() => setIsChangingLocation(false)}
              className={cn(
                "w-full text-center text-xs underline pt-1 cursor-pointer",
                isDarkMode ? "text-neutral-400 hover:text-neutral-200" : "text-slate-600 hover:text-slate-900"
              )}
            >
              Cancel
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Filter Input */}
          <div className="px-3 pt-2.5 pb-1.5">
            <div
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
                isDarkMode
                  ? 'bg-black/20 border-white/10 text-neutral-300 focus-within:border-white/25'
                  : 'bg-white border-slate-300 text-slate-800 focus-within:border-blue-500 shadow-2xs font-medium'
              )}
            >
              <Search className="w-3.5 h-3.5 opacity-60 shrink-0" />
              <input
                type="text"
                placeholder="Search files..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full bg-transparent outline-none placeholder:opacity-60 text-xs"
              />
            </div>
          </div>

          {/* Scrollable Tree */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-xs opacity-70">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-500" />
                <span>Scanning workspace files...</span>
              </div>
            ) : errorMsg ? (
              <div className="flex flex-col items-center justify-center h-48 px-3 text-center gap-2">
                <p className="text-xs text-red-500 font-semibold">{errorMsg}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded transition-colors cursor-pointer",
                      isDarkMode ? "bg-white/10 hover:bg-white/20 text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-800"
                    )}
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsChangingLocation(true)}
                    className="text-xs px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-600 dark:text-cyan-300 transition-colors cursor-pointer font-semibold"
                  >
                    Change Folder
                  </button>
                </div>
              </div>
            ) : displayedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 px-3 text-center gap-1.5 opacity-70 text-xs">
                <Folder className="w-5 h-5 opacity-50 mb-1" />
                <p className="font-semibold text-slate-800 dark:text-neutral-200">No files found</p>
                <p className="text-xs text-slate-500 dark:text-neutral-400">Workspace folder is empty or matches no filters.</p>
                <button
                  type="button"
                  onClick={() => setIsChangingLocation(true)}
                  className="mt-2 text-xs px-2.5 py-1 rounded bg-blue-50 dark:bg-white/10 hover:bg-blue-100 text-blue-700 dark:text-cyan-300 border border-blue-200 dark:border-transparent transition-colors cursor-pointer font-semibold"
                >
                  Choose Another Folder
                </button>
              </div>
            ) : (
              <FileTreeTemplate
                isDarkMode={isDarkMode}
                data={displayedFiles}
                onFileSelect={onSelectFile}
                className="max-h-none border-none p-0 bg-transparent shadow-none"
              />
            )}
          </div>
        </>
      )}
    </aside>
  );
};

export default WorkspaceTreePanel;
