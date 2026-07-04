import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  ArrowLeft,
  GitBranch,
  Sparkles,
  Settings as SettingsIcon,
  Search,
  Bot,
  Terminal as TerminalIcon,
  GitCompare,
  Save,
  PanelLeft,
  FileCode,
  AlertCircle,
} from 'lucide-react';
import { FileTree } from './sidebar/FileTree';
import { AgentChat } from './chat/AgentChat';
import { EditorTabs } from './editor/EditorTabs';
import { AgentTimeline } from './panels/AgentTimeline';
import { Terminal } from './panels/Terminal';
import { StatusBar } from './layout/StatusBar';
import { ResizablePanel } from './layout/ResizablePanel';
import { ConnectionIndicators } from './layout/ConnectionIndicators';
import { DiffViewer } from './editor/DiffViewer';
import { SearchModal } from './SearchModal';
import { SettingsModal } from './SettingsModal';
import { ThemeToggle } from './ui/ThemeToggle';
import { LoadingOverlay } from './ui/LoadingSpinner';
import { EmptyState } from './ui/EmptyState';
import { useAgentSocket } from '../hooks/useAgentSocket';
import { useTheme } from '../context/ThemeContext';
import { api, extractError } from '../api/client';
import type { CodeChange, Project } from '../api/types';
import { languageFromName } from '../lib/language';
import { toast } from '../lib/toast';

interface OpenTab {
  path: string;
  name: string;
  content: string;
  original: string;
}

export const Workspace: React.FC = () => {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [project, setProject] = useState<Project | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [treeToken, setTreeToken] = useState(0);
  const [bottomPanel, setBottomPanel] = useState<'timeline' | 'terminal'>('timeline');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);

  const socket = useAgentSocket(projectId);
  const preRunSnapshot = useRef<Record<string, string>>({});
  const prevRunning = useRef(false);

  const activeTab = tabs.find((t) => t.path === activePath) || null;

  // Load project metadata.
  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getProject(projectId)
      .then((p) => active && (setProject(p), setLoadError(null)))
      .catch((err) => active && setLoadError(extractError(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [projectId]);

  const openFile = useCallback(
    async (path: string, name?: string) => {
      const existing = tabs.find((t) => t.path === path);
      if (existing) {
        setActivePath(path);
        return;
      }
      try {
        const file = await api.getFile(projectId, path);
        setTabs((prev) => [
          ...prev,
          { path, name: name || path.split('/').pop() || path, content: file.content, original: file.content },
        ]);
        setActivePath(path);
      } catch (err) {
        toast.error('Could not open file', extractError(err));
      }
    },
    [projectId, tabs],
  );

  const closeTab = (path: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.path !== path);
      if (activePath === path) setActivePath(next.length ? next[next.length - 1].path : null);
      return next;
    });
  };

  const updateActiveContent = (content: string) => {
    if (!activeTab) return;
    setTabs((prev) => prev.map((t) => (t.path === activeTab.path ? { ...t, content } : t)));
  };

  const saveActive = useCallback(async () => {
    const tab = tabs.find((t) => t.path === activePath);
    if (!tab || tab.content === tab.original) return;
    try {
      await api.saveFile(projectId, tab.path, tab.content);
      setTabs((prev) => prev.map((t) => (t.path === tab.path ? { ...t, original: t.content } : t)));
      setTreeToken((n) => n + 1);
      toast.success('Saved', tab.path);
    } catch (err) {
      toast.error('Save failed', extractError(err));
    }
  }, [tabs, activePath, projectId]);

  // Send to agent + snapshot open files so we can diff/revert afterwards.
  const handleSend = (message: string) => {
    const snap: Record<string, string> = {};
    for (const t of tabs) snap[t.path] = t.original;
    preRunSnapshot.current = snap;
    if (!socket.send(message, projectId)) {
      toast.error('Not connected', 'The agent WebSocket is not connected yet.');
    }
  };

  // When a run finishes with pending changes, surface the diff + refresh tree.
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
      setTabs((prev) =>
        prev.map((t) =>
          t.path === change.file_path ? { ...t, content: change.content, original: change.content } : t,
        ),
      );
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
        setTabs((prev) =>
          prev.map((t) =>
            t.path === change.file_path ? { ...t, content: prevContent, original: prevContent } : t,
          ),
        );
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

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveActive();
      } else if (mod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarVisible((v) => !v);
      } else if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveActive]);

  const changedPaths = useMemo(() => {
    const s = new Set<string>();
    for (const c of socket.pendingChanges) s.add(c.file_path);
    for (const t of tabs) if (t.content !== t.original) s.add(t.path);
    return s;
  }, [socket.pendingChanges, tabs]);

  const editorTabs = tabs.map((t) => ({
    id: t.path,
    name: t.name,
    language: languageFromName(t.name),
    path: t.path.includes('/') ? t.path.slice(0, t.path.lastIndexOf('/')) : '',
    isModified: t.content !== t.original,
    isActive: t.path === activePath,
  }));

  if (loading) return <LoadingOverlay message="Opening workspace…" />;

  if (loadError || !project) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <EmptyState
          icon={<AlertCircle size={36} className="text-error" />}
          title="Workspace unavailable"
          description={loadError || 'Project not found.'}
          action={
            <button onClick={() => navigate('/')} className="btn-secondary">
              Back to dashboard
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <div className="h-12 border-b border-border bg-background-elevated flex items-center justify-between px-3 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 hover:bg-background-hover rounded-md transition-colors text-text-muted hover:text-text-primary"
            title="Back to dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <GitBranch size={16} className="text-primary shrink-0" />
            <span className="text-sm font-medium text-text-primary truncate">{project.name}</span>
            <span className="text-xs text-text-secondary bg-background px-2 py-0.5 rounded-md border border-border shrink-0">
              {project.branch}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-text-muted">
            <Sparkles size={14} className="text-warning" />
            <span className="text-xs">Gemini 2.5 Flash</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ConnectionIndicators wsStatus={socket.status} />
          {socket.pendingChanges.length > 0 && (
            <button
              onClick={() => setDiffOpen(true)}
              className="flex items-center gap-1.5 text-xs bg-warning/15 text-warning border border-warning/30 rounded-md px-2 py-1 hover:bg-warning/25 transition-colors"
            >
              <GitCompare size={13} /> {socket.pendingChanges.length} change
              {socket.pendingChanges.length === 1 ? '' : 's'}
            </button>
          )}
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 hover:bg-background-hover rounded-md transition-colors text-text-muted hover:text-text-primary"
            title="Search (Cmd/Ctrl+K)"
          >
            <Search size={16} />
          </button>
          <ThemeToggle />
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 hover:bg-background-hover rounded-md transition-colors text-text-muted hover:text-text-primary"
            title="Settings"
          >
            <SettingsIcon size={16} />
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {sidebarVisible && (
          <ResizablePanel
            direction="horizontal"
            defaultSize={260}
            minSize={180}
            maxSize={420}
            className="border-r border-border"
          >
            <FileTree
              projectId={projectId}
              branch={project.branch}
              reloadToken={treeToken}
              activePath={activePath ?? undefined}
              changedPaths={changedPaths}
              onFileSelect={openFile}
            />
          </ResizablePanel>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center bg-background-elevated border-b border-border">
            <button
              onClick={() => setSidebarVisible((v) => !v)}
              className="p-2 hover:bg-background-hover text-text-muted hover:text-text-primary transition-colors"
              title="Toggle explorer (Cmd/Ctrl+B)"
            >
              <PanelLeft size={15} />
            </button>
            <div className="flex-1 min-w-0">
              <EditorTabs tabs={editorTabs} onTabClose={closeTab} onTabSelect={setActivePath} />
            </div>
            {activeTab && activeTab.content !== activeTab.original && (
              <button
                onClick={saveActive}
                className="flex items-center gap-1.5 text-xs text-primary hover:bg-background-hover px-3 py-1.5 transition-colors"
                title="Save (Cmd/Ctrl+S)"
              >
                <Save size={13} /> Save
              </button>
            )}
          </div>

          <div className="flex-1 relative min-h-0">
            {activeTab ? (
              <Editor
                height="100%"
                path={activeTab.path}
                language={languageFromName(activeTab.name)}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                value={activeTab.content}
                onChange={(val) => updateActiveContent(val ?? '')}
                options={{
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  padding: { top: 12 },
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  smoothScrolling: true,
                  cursorSmoothCaretAnimation: 'on',
                  bracketPairColorization: { enabled: true },
                }}
              />
            ) : (
              <EmptyState
                className="h-full"
                icon={<FileCode size={40} />}
                title="No file open"
                description="Pick a file from the explorer, or ask the AI to make changes."
              />
            )}
          </div>

          <ResizablePanel
            direction="vertical"
            defaultSize={220}
            minSize={120}
            maxSize={460}
            className="border-t border-border"
          >
            <div className="flex items-center border-b border-border bg-background-elevated">
              <button
                onClick={() => setBottomPanel('timeline')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors ${
                  bottomPanel === 'timeline'
                    ? 'text-text-primary border-b-2 border-b-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Bot size={14} /> Agent Timeline
                {socket.timeline.length > 0 && (
                  <span className="text-xs bg-background px-1.5 py-0.5 rounded">
                    {socket.timeline.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setBottomPanel('terminal')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors ${
                  bottomPanel === 'terminal'
                    ? 'text-text-primary border-b-2 border-b-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <TerminalIcon size={14} /> Terminal
              </button>
            </div>
            <div className="h-[calc(100%-37px)]">
              {bottomPanel === 'timeline' ? (
                <AgentTimeline events={socket.timeline} />
              ) : (
                <Terminal projectId={projectId} agentLogs={socket.commandLogs} />
              )}
            </div>
          </ResizablePanel>
        </div>

        <ResizablePanel
          direction="horizontal"
          defaultSize={380}
          minSize={300}
          maxSize={620}
          className="border-l border-border"
        >
          <AgentChat
            messages={socket.messages}
            status={socket.status}
            running={socket.running}
            onSend={handleSend}
            onReset={socket.reset}
          />
        </ResizablePanel>
      </div>

      <StatusBar
        branch={project.branch}
        changes={changedPaths.size}
        running={socket.running}
        activeFile={activeTab?.path}
        language={activeTab ? languageFromName(activeTab.name) : undefined}
      />

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
        onOpenFile={(path) => openFile(path)}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};
