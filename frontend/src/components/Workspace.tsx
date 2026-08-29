import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  Search,
  GitCompare,
  PanelLeft,
  Files,
  Settings as SettingsIcon,
  Columns,
  Command,
  LayoutDashboard,
  GitBranch
} from 'lucide-react';
import { FileTree } from './sidebar/FileTree';
import { SourceControl } from './sidebar/SourceControl';
import { AgentChat } from './chat/AgentChat';
import { EditorTabs } from './editor/EditorTabs';
import { Terminal } from './panels/Terminal';
import { StatusBar } from './layout/StatusBar';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, useDefaultLayout } from 'react-resizable-panels';
import { ConnectionIndicators } from './layout/ConnectionIndicators';
import { DiffViewer } from './editor/DiffViewer';
import { SearchModal } from './SearchModal';
import { SettingsModal } from './SettingsModal';
import { LoadingOverlay } from './ui/LoadingSpinner';
import { ErrorState } from './ui/ErrorState';
import { IndexingProgress } from './IndexingProgress';
import { ProblemsPanel } from './panels/ProblemsPanel';
import { OutputPanel } from './panels/OutputPanel';
import { useAgentSocket } from '../hooks/useAgentSocket';
import { useTheme } from '../context/ThemeContext';
import { api, extractError } from '../api/client';
import type { CodeChange, Project } from '../api/types';
import { languageFromName } from '../lib/language';
import { toast } from '../lib/toast';
import { useAuth } from '../context/AuthContext';
import { useHotkeys } from '../hooks/useHotkeys';

interface OpenTab {
  path: string;
  name: string;
  content: string;
  original: string;
  isDiffView?: boolean;
}

import { DiffEditor } from '@monaco-editor/react';

export const Workspace: React.FC = () => {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();

  const { defaultLayout: workspaceLayout, onLayoutChanged: onWorkspaceLayoutChanged } = useDefaultLayout({ id: "workspace-layout-v5" });
  const { defaultLayout: editorLayout, onLayoutChanged: onEditorLayoutChanged } = useDefaultLayout({ id: "editor-layout-v3" });

  const [project, setProject] = useState<Project | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [activePathSecondary, setActivePathSecondary] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState(false);
  const [activeEditorPane, setActiveEditorPane] = useState<'primary' | 'secondary'>('primary');

  const [treeToken, setTreeToken] = useState(0);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  
  type BottomPanel = 'terminal' | 'problems' | 'output' | 'none';
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>('terminal');
  const [zenMode, setZenMode] = useState(false);
  const [assistantVisible, setAssistantVisible] = useState(true);
  
  const [cursorPosition, setCursorPosition] = useState<{line: number; col: number} | undefined>(undefined);
  const [cursorPositionSecondary, setCursorPositionSecondary] = useState<{line: number; col: number} | undefined>(undefined);
  
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);

  const [activityView, setActivityView] = useState<'explorer' | 'search' | 'git'>('explorer');

  const socket = useAgentSocket(projectId);
  const preRunSnapshot = useRef<Record<string, string>>({});
  const prevRunning = useRef(false);

  const activeTabPrimary = tabs.find((t) => t.path === activePath) || null;
  const activeTabSecondary = splitMode ? (tabs.find((t) => t.path === activePathSecondary) || null) : null;

  const fetchProject = useCallback(() => {
    let active = true;
    setLoading(true);
    api.getProject(projectId)
      .then((p) => active && (setProject(p), setLoadError(null)))
      .catch((err) => active && setLoadError(extractError(err)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    const cleanup = fetchProject();
    return cleanup;
  }, [fetchProject]);

  const openFile = useCallback(
    async (path: string, name?: string) => {
      const existing = tabs.find((t) => t.path === path);
      if (!existing) {
        try {
          const file = await api.getFile(projectId, path);
          setTabs((prev) => [
            ...prev,
            { path, name: name || path.split('/').pop() || path, content: file.content, original: file.content },
          ]);
          // Fire-and-forget prioritization to instantly index opened files
          api.prioritizeFile(projectId, path).catch(console.error);
        } catch (err) {
          toast.error('Could not open file', extractError(err));
          return;
        }
      }
      if (activeEditorPane === 'secondary' && splitMode) {
        setActivePathSecondary(path);
      } else {
        setActivePath(path);
      }
    },
    [projectId, tabs, activeEditorPane, splitMode]
  );

  const openDiffTab = useCallback(
    async (path: string) => {
      const tabPath = `git-diff://${path}`;
      const existing = tabs.find((t) => t.path === tabPath);
      if (!existing) {
        try {
          const fileRes = await api.getFile(projectId, path).catch(() => ({ content: '' }));
          const gitRes = await api.runCommand(projectId, `git show HEAD:"${path}"`);
          const original = gitRes.exit_code === 0 ? (gitRes.stdout || '') : '';
          
          setTabs((prev) => [
            ...prev,
            { path: tabPath, name: (path.split('/').pop() || path) + ' (Working Tree)', content: fileRes.content, original, isDiffView: true },
          ]);
        } catch (err) {
          toast.error('Could not open diff', extractError(err));
          return;
        }
      }
      if (activeEditorPane === 'secondary' && splitMode) {
        setActivePathSecondary(tabPath);
      } else {
        setActivePath(tabPath);
      }
    },
    [projectId, tabs, activeEditorPane, splitMode]
  );

  const closeTab = (path: string, pane: 'primary' | 'secondary' = 'primary') => {
    if (pane === 'primary' && activePath === path) {
      const nextTabs = tabs.filter(t => t.path !== path);
      setActivePath(nextTabs.length ? nextTabs[nextTabs.length - 1].path : null);
    }
    if (pane === 'secondary' && activePathSecondary === path) {
      const nextTabs = tabs.filter(t => t.path !== path);
      setActivePathSecondary(nextTabs.length ? nextTabs[nextTabs.length - 1].path : null);
    }
    
    setTabs((prev) => {
      const isUsedElseWhere = (pane === 'primary' && activePathSecondary === path) || 
                              (pane === 'secondary' && activePath === path);
      if (isUsedElseWhere) return prev; 
      return prev.filter((t) => t.path !== path);
    });
  };

  const updateActiveContent = (content: string, pane: 'primary' | 'secondary') => {
    const targetPath = pane === 'primary' ? activePath : activePathSecondary;
    if (!targetPath) return;
    setTabs((prev) => prev.map((t) => (t.path === targetPath ? { ...t, content } : t)));
  };

  const saveActive = useCallback(async () => {
    const targetPath = activeEditorPane === 'primary' ? activePath : activePathSecondary;
    const tab = tabs.find((t) => t.path === targetPath);
    if (!tab || tab.content === tab.original) return;
    try {
      await api.saveFile(projectId, tab.path, tab.content);
      setTabs((prev) => prev.map((t) => (t.path === tab.path ? { ...t, original: t.content } : t)));
      setTreeToken((n) => n + 1);
      toast.success('Saved', tab.path);
    } catch (err) {
      toast.error('Save failed', extractError(err));
    }
  }, [tabs, activePath, activePathSecondary, activeEditorPane, projectId]);

  const handleSend = (message: string) => {
    const snap: Record<string, string> = {};
    for (const t of tabs) snap[t.path] = t.original;
    preRunSnapshot.current = snap;
    if (!socket.send(message, projectId)) {
      toast.error('Not connected', 'The agent WebSocket is not connected yet.');
    }
  };

  useEffect(() => {
    if (prevRunning.current && !socket.running && socket.pendingChanges.length > 0) {
      setDiffOpen(true);
      setTreeToken((n) => n + 1);
    }
    prevRunning.current = socket.running;
  }, [socket.running, socket.pendingChanges.length]);

  const originalFor = useCallback(
    (path: string) => preRunSnapshot.current[path] ?? tabs.find((t) => t.path === path)?.original ?? '',
    [tabs],
  );

  const applyChange = async (change: CodeChange) => {
    try {
      await api.saveFile(projectId, change.file_path, change.content);
      setTabs((prev) => prev.map((t) =>
        t.path === change.file_path ? { ...t, content: change.content, original: change.content } : t,
      ));
      socket.dismissChange(change.file_path);
      setTreeToken((n) => n + 1);
      toast.success('Change applied', change.file_path);
    } catch (err) {
      toast.error('Apply failed', extractError(err));
    }
  };

  const rejectChange = async (change: CodeChange) => {
    const hadSnapshot = Object.prototype.hasOwnProperty.call(preRunSnapshot.current, change.file_path);
    try {
      if (hadSnapshot) {
        const prevContent = preRunSnapshot.current[change.file_path];
        await api.saveFile(projectId, change.file_path, prevContent);
        setTabs((prev) => prev.map((t) =>
          t.path === change.file_path ? { ...t, content: prevContent, original: prevContent } : t,
        ));
        toast.info('Change reverted', change.file_path);
      } else {
        toast.warning('Left agent version on disk', 'No prior version was open to revert to.');
      }
      socket.dismissChange(change.file_path);
      setTreeToken((n) => n + 1);
    } catch (err) {
      toast.error('Revert failed', extractError(err));
    }
  };

  // Keyboard Shortcuts via Hook
  useHotkeys('cmd+s', saveActive);
  useHotkeys('ctrl+s', saveActive);
  useHotkeys('cmd+b', () => setSidebarVisible(v => !v));
  useHotkeys('ctrl+b', () => setSidebarVisible(v => !v));
  useHotkeys('cmd+k', () => setSearchOpen(true));
  useHotkeys('ctrl+k', () => setSearchOpen(true));
  useHotkeys('cmd+`', () => setBottomPanel(p => p === 'none' ? 'terminal' : 'none'));
  useHotkeys('ctrl+`', () => setBottomPanel(p => p === 'none' ? 'terminal' : 'none'));
  
  // Zen Mode shortcut
  const toggleZenMode = useCallback(() => {
    setZenMode(z => {
      if (!z) {
        setSidebarVisible(false);
        setBottomPanel('none');
        setAssistantVisible(false);
        return true;
      } else {
        setSidebarVisible(true);
        setBottomPanel('terminal');
        setAssistantVisible(true);
        return false;
      }
    });
  }, []);
  
  useHotkeys('cmd+shift+z', toggleZenMode);
  useHotkeys('ctrl+shift+z', toggleZenMode);

  const changedPaths = useMemo(() => {
    const s = new Set<string>();
    for (const c of socket.pendingChanges) s.add(c.file_path);
    for (const t of tabs) if (t.content !== t.original) s.add(t.path);
    return s;
  }, [socket.pendingChanges, tabs]);

  const editorTabsPrimary = tabs.map((t) => ({
    id: t.path,
    name: t.name,
    language: languageFromName(t.name),
    path: t.path.includes('/') ? t.path.slice(0, t.path.lastIndexOf('/')) : '',
    isModified: t.content !== t.original,
    isActive: t.path === activePath,
  }));
  
  const editorTabsSecondary = splitMode ? tabs.map((t) => ({
    id: t.path,
    name: t.name,
    language: languageFromName(t.name),
    path: t.path.includes('/') ? t.path.slice(0, t.path.lastIndexOf('/')) : '',
    isModified: t.content !== t.original,
    isActive: t.path === activePathSecondary,
  })) : [];

  if (loading) return <LoadingOverlay message="Opening workspace…" />;
  if (loadError || !project) {
    return (
      <ErrorState 
        fullScreen 
        title="Workspace unavailable"
        message={loadError || 'Project not found.'}
        onRetry={() => navigate('/')} 
      />
    );
  }

  if (project.index_status === 'pending' || project.index_status === 'indexing') {
    return <IndexingProgress projectId={projectId} onComplete={fetchProject} />;
  }

  return (
    <div className="flex flex-col h-screen bg-background text-text-primary text-sm overflow-hidden">
      {/* Premium Command Bar (Top Navigation) */}
      <div className="h-11 border-b border-border bg-background flex items-center justify-between px-3 gap-4 shrink-0 z-10 select-none">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="icon-btn hover:bg-bg-hover" title="Dashboard">
            <LayoutDashboard size={18} />
          </button>
        </div>
        
        <div className="flex-1 flex justify-center">
          <button 
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-3 bg-background-elevated/50 border border-border/80 hover:border-primary/50 hover:bg-background-elevated rounded-md px-4 py-1.5 text-xs text-text-muted hover:text-text-primary transition-all w-full max-w-xl group shadow-sm"
          >
            <Search size={14} className="group-hover:text-primary transition-colors" />
            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-center">
              <span className="font-semibold text-text-primary truncate tracking-tight">{project.name}</span>
            </div>
            <span className="opacity-50 text-[10px] font-semibold border border-border/50 rounded px-1.5 hidden md:block">⌘K</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {socket.pendingChanges.length > 0 && (
            <button
              onClick={() => setDiffOpen(true)}
              className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary border border-primary/20 rounded py-1 px-2 hover:bg-primary/20 transition-colors font-medium shadow-sm animate-fade-in"
            >
              <GitCompare size={14} /> Review {socket.pendingChanges.length} Changes
            </button>
          )}
          <ConnectionIndicators />
          {user && (
            <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-primary-active flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-border cursor-pointer hover:opacity-90">
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className={`flex-1 flex overflow-hidden ${zenMode ? 'zen-mode' : ''}`}>
        {/* Activity Bar (Thin Left Panel) */}
        {!zenMode && (
          <div className="w-12 border-r border-border bg-background-sidebar flex flex-col items-center py-3 gap-3 shrink-0 z-10 shadow-[1px_0_2px_rgba(0,0,0,0.05)] select-none">
            <div 
              className={`activity-bar-btn ${activityView === 'explorer' && sidebarVisible ? 'active' : ''}`}
              onClick={() => { setActivityView('explorer'); setSidebarVisible(true); }}
              title="Explorer (Cmd/Ctrl+B)"
            >
              <Files size={24} strokeWidth={1.5} />
            </div>
            <div 
              className={`activity-bar-btn ${searchOpen ? 'active' : ''}`}
              onClick={() => setSearchOpen(true)}
              title="Search (Cmd/Ctrl+K)"
            >
              <Search size={24} strokeWidth={1.5} />
            </div>
            <div 
              className={`activity-bar-btn ${activityView === 'git' && sidebarVisible ? 'active' : ''}`}
              onClick={() => { setActivityView('git'); setSidebarVisible(true); }}
              title="Source Control"
            >
              <GitBranch size={24} strokeWidth={1.5} />
            </div>
            <div className="flex-1" />
            <div className="activity-bar-btn" onClick={() => setSettingsOpen(true)} title="Settings">
              <SettingsIcon size={24} strokeWidth={1.5} />
            </div>
          </div>
        )}

        <PanelGroup 
          id="workspace-layout-v5"
          defaultLayout={workspaceLayout}
          onLayoutChanged={onWorkspaceLayoutChanged}
          orientation="horizontal" 
          className="w-[calc(100vw-48px)] h-full overflow-hidden"
        >
          {/* Sidebar */}
          {sidebarVisible && (
            <Panel id="sidebar" defaultSize={260} minSize={260} maxSize={500} className="bg-background-sidebar flex flex-col overflow-hidden">
              <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                <div className={activityView === 'explorer' ? 'h-full flex-col flex' : 'hidden'}>
                  <FileTree
                    projectId={projectId}
                    branch={project.branch}
                    projectName={project.name}
                    reloadToken={treeToken}
                    activePath={activePath ?? undefined}
                    changedPaths={changedPaths}
                    onFileSelect={openFile}
                    onCollapse={() => setSidebarVisible(false)}
                  />
                </div>
                <div className={activityView === 'git' ? 'h-full flex-col flex' : 'hidden'}>
                  <SourceControl
                    projectId={projectId}
                    reloadToken={treeToken}
                    onOpenFile={(path, diff) => diff ? openDiffTab(path) : openFile(path)}
                  />
                </div>
              </div>
            </Panel>
          )}
          {sidebarVisible && (
            <PanelResizeHandle className="w-[1px] bg-border hover:bg-primary hover:w-[3px] hover:-ml-[1px] transition-all cursor-col-resize relative z-20" />
          )}

          {/* Editor & Terminal Area */}
          <Panel id="main" className="flex flex-col bg-background overflow-hidden">
            <PanelGroup 
              id="editor-layout-v3"
              defaultLayout={editorLayout}
              onLayoutChanged={onEditorLayoutChanged}
              orientation="vertical" 
              className="w-full h-full"
            >
              <Panel id="editor" className="flex flex-col overflow-hidden">
                <div className="flex-1 flex min-h-0 min-w-0">
                  {/* Primary Editor Pane */}
                  <div className={`flex-1 flex flex-col min-w-0 ${splitMode ? 'border-r border-border' : ''}`} onClick={() => setActiveEditorPane('primary')}>
                    <div className="flex items-center bg-background border-b border-border h-9 select-none shrink-0">
                      <div className="w-[calc(100vw-48px)] h-full overflow-hidden">
                        <EditorTabs tabs={editorTabsPrimary} onTabClose={(p) => closeTab(p, 'primary')} onTabSelect={setActivePath} />
                      </div>
                      <div className="flex items-center pr-2 gap-1 shrink-0 bg-background">
                        <button onClick={() => setSplitMode(!splitMode)} className={`icon-btn ${splitMode ? 'icon-btn-active' : ''}`} title="Split Editor">
                          <Columns size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 relative min-h-0 min-w-0">
                      {activeTabPrimary ? (
                        activeTabPrimary.isDiffView ? (
                          <DiffEditor
                            height="100%"
                            language={languageFromName(activeTabPrimary.name.replace(' (Working Tree)', ''))}
                            original={activeTabPrimary.original}
                            modified={activeTabPrimary.content}
                            theme={theme === 'dark' ? 'vs-dark' : 'light'}
                            options={{
                              readOnly: true,
                              renderSideBySide: true,
                              minimap: { enabled: false },
                              fontSize: 13,
                              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                              scrollBeyondLastLine: false,
                              automaticLayout: true,
                              diffWordWrap: 'off',
                              padding: { top: 16, bottom: 16 },
                            }}
                          />
                        ) : (
                          <Editor
                            height="100%"
                            path={activeTabPrimary.path}
                            language={languageFromName(activeTabPrimary.name)}
                            theme={theme === 'dark' ? 'vs-dark' : 'light'}
                            value={activeTabPrimary.content}
                            onChange={(val) => updateActiveContent(val ?? '', 'primary')}
                            onMount={(editor) => {
                              editor.onDidChangeCursorPosition((e) => {
                                setCursorPosition({ line: e.position.lineNumber, col: e.position.column });
                              });
                            }}
                            options={{
                              fontSize: 13,
                              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                              padding: { top: 16, bottom: 16 },
                              minimap: { enabled: false },
                              scrollBeyondLastLine: false,
                              automaticLayout: true,
                              smoothScrolling: true,
                              cursorSmoothCaretAnimation: 'on',
                              scrollbar: {
                                verticalScrollbarSize: 8,
                                horizontalScrollbarSize: 8,
                              }
                            }}
                          />
                        )
                      ) : (
                        <div className="h-full bg-background flex flex-col items-center justify-center p-8 select-none">
                          <Command size={48} className="text-border mb-6" strokeWidth={1} />
                          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-xs text-text-muted">
                            <div className="flex justify-between w-40"><span>Show Command Palette</span><span className="font-semibold px-1.5 py-0.5 rounded bg-background-elevated border border-border">⌘K</span></div>
                            <div className="flex justify-between w-40"><span>Toggle Terminal</span><span className="font-semibold px-1.5 py-0.5 rounded bg-background-elevated border border-border">⌘`</span></div>
                            <div className="flex justify-between w-40"><span>Toggle Sidebar</span><span className="font-semibold px-1.5 py-0.5 rounded bg-background-elevated border border-border">⌘B</span></div>
                            <div className="flex justify-between w-40"><span>Save File</span><span className="font-semibold px-1.5 py-0.5 rounded bg-background-elevated border border-border">⌘S</span></div>
                            <div className="flex justify-between w-40 col-span-2 mx-auto mt-2 text-text-primary">
                              <span>Zen Mode</span><span className="font-semibold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">⌘⇧Z</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Secondary Editor Pane */}
                  {splitMode && (
                    <div className="flex-1 flex flex-col min-w-0" onClick={() => setActiveEditorPane('secondary')}>
                      <div className="flex items-center bg-background border-b border-border h-9 select-none shrink-0">
                        <div className="w-[calc(100vw-48px)] h-full overflow-hidden">
                          <EditorTabs tabs={editorTabsSecondary} onTabClose={(p) => closeTab(p, 'secondary')} onTabSelect={setActivePathSecondary} />
                        </div>
                        <div className="flex items-center pr-2 gap-1 shrink-0 bg-background">
                          <button onClick={() => setSplitMode(false)} className="icon-btn" title="Close Split"><Columns size={14} className="opacity-50" /></button>
                        </div>
                      </div>
                      <div className="flex-1 relative min-h-0 min-w-0">
                        {activeTabSecondary ? (
                          activeTabSecondary.isDiffView ? (
                            <DiffEditor
                              height="100%"
                              language={languageFromName(activeTabSecondary.name.replace(' (Working Tree)', ''))}
                              original={activeTabSecondary.original}
                              modified={activeTabSecondary.content}
                              theme={theme === 'dark' ? 'vs-dark' : 'light'}
                              options={{
                                readOnly: true,
                                renderSideBySide: true,
                                minimap: { enabled: false },
                                fontSize: 13,
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                diffWordWrap: 'off',
                                padding: { top: 16, bottom: 16 },
                              }}
                            />
                          ) : (
                            <Editor
                              height="100%"
                              path={activeTabSecondary.path}
                              language={languageFromName(activeTabSecondary.name)}
                              theme={theme === 'dark' ? 'vs-dark' : 'light'}
                              value={activeTabSecondary.content}
                              onChange={(val) => updateActiveContent(val ?? '', 'secondary')}
                              onMount={(editor) => {
                                editor.onDidChangeCursorPosition((e) => {
                                  setCursorPositionSecondary({ line: e.position.lineNumber, col: e.position.column });
                                });
                              }}
                              options={{
                                fontSize: 13,
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                padding: { top: 16, bottom: 16 },
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                smoothScrolling: true,
                                cursorSmoothCaretAnimation: 'on',
                                scrollbar: {
                                  verticalScrollbarSize: 8,
                                  horizontalScrollbarSize: 8,
                                }
                              }}
                            />
                          )
                        ) : (
                          <div className="h-full bg-background flex flex-col items-center justify-center p-8 select-none">
                            <Command size={48} className="text-border mb-6" strokeWidth={1} />
                            <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-xs text-text-muted">
                              <div className="flex justify-between w-40"><span>Show Command Palette</span><span className="font-semibold px-1.5 py-0.5 rounded bg-background-elevated border border-border">⌘K</span></div>
                              <div className="flex justify-between w-40"><span>Toggle Terminal</span><span className="font-semibold px-1.5 py-0.5 rounded bg-background-elevated border border-border">⌘`</span></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Panel>

              {bottomPanel !== 'none' && (
                <PanelResizeHandle className="h-[1px] bg-border hover:bg-primary hover:h-[3px] hover:-mt-[1px] transition-all cursor-row-resize relative z-20" />
              )}
              {bottomPanel !== 'none' && (
                <Panel id="bottom-panel" defaultSize={200} minSize={100} maxSize={500} className="bg-background flex flex-col min-h-[100px] overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border bg-background-elevated shrink-0 px-2 h-9">
                    <div className="flex h-full text-[11px] font-semibold text-text-muted uppercase tracking-wider select-none">
                      <div 
                        className={`flex items-center gap-1.5 px-3 h-full cursor-pointer hover:text-text-primary ${bottomPanel === 'terminal' ? 'text-primary border-b border-primary' : ''}`}
                        onClick={() => setBottomPanel('terminal')}
                      >
                        Terminal
                      </div>
                      <div 
                        className={`flex items-center gap-1.5 px-3 h-full cursor-pointer hover:text-text-primary ${bottomPanel === 'problems' ? 'text-primary border-b border-primary' : ''}`}
                        onClick={() => setBottomPanel('problems')}
                      >
                        Problems
                      </div>
                      <div 
                        className={`flex items-center gap-1.5 px-3 h-full cursor-pointer hover:text-text-primary ${bottomPanel === 'output' ? 'text-primary border-b border-primary' : ''}`}
                        onClick={() => setBottomPanel('output')}
                      >
                        Output
                      </div>
                    </div>
                    <button onClick={() => setBottomPanel('none')} className="icon-btn" title="Close Panel (Cmd+`)">
                      <PanelLeft size={13} className="rotate-90" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden min-w-0 min-h-0">
                    {bottomPanel === 'terminal' && <Terminal projectId={projectId} agentLogs={socket.commandLogs} />}
                    {bottomPanel === 'problems' && <ProblemsPanel onClose={() => setBottomPanel('none')} />}
                    {bottomPanel === 'output' && <OutputPanel onClose={() => setBottomPanel('none')} />}
                  </div>
                </Panel>
              )}
            </PanelGroup>
          </Panel>

          {assistantVisible && (
            <PanelResizeHandle className="w-[1px] bg-border hover:bg-primary hover:w-[3px] hover:-ml-[1px] transition-all cursor-col-resize relative z-20" />
          )}

          {/* AI Assistant Pane */}
          {assistantVisible && (
            <Panel id="assistant" defaultSize={400} minSize={360} maxSize={500} className="bg-background-sidebar flex flex-col h-full overflow-hidden">
              <div className="flex-1 overflow-hidden flex flex-col h-full">
                <AgentChat
                  messages={socket.messages}
                  timeline={socket.timeline}
                  status={socket.status}
                  running={socket.running}
                  onSend={handleSend}
                  onReset={socket.reset}
                  onCancel={socket.cancel}
                />
              </div>
            </Panel>
          )}
        </PanelGroup>
      </div>

      {!zenMode && (
        <StatusBar
          branch={project.branch}
          changes={changedPaths.size}
          running={socket.running}
          activeFile={activeEditorPane === 'primary' ? activeTabPrimary?.path : activeTabSecondary?.path}
          language={activeEditorPane === 'primary' ? (activeTabPrimary ? languageFromName(activeTabPrimary.name) : undefined) : (activeTabSecondary ? languageFromName(activeTabSecondary.name) : undefined)}
          project={project}
          cursorPosition={activeEditorPane === 'primary' ? cursorPosition : cursorPositionSecondary}
        />
      )}

      <DiffViewer
        open={diffOpen}
        changes={socket.pendingChanges}
        originalFor={originalFor}
        theme={theme}
        onApply={applyChange}
        onReject={rejectChange}
        onClose={() => setDiffOpen(false)}
      />
      <SearchModal 
        open={searchOpen} 
        projectId={projectId} 
        onClose={() => setSearchOpen(false)} 
        onOpenFile={openFile} 
        onCommand={(cmd) => {
          if (cmd === 'zen') toggleZenMode();
          else if (cmd === 'settings') setSettingsOpen(true);
          else if (cmd === 'sidebar') setSidebarVisible(v => !v);
          else if (cmd === 'terminal') setBottomPanel(p => p === 'terminal' ? 'none' : 'terminal');
          else if (cmd === 'diff') setDiffOpen(true);
        }}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};
