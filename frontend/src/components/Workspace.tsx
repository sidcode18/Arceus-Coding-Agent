import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { FileTree } from './sidebar/FileTree';
import { AgentChat } from './chat/AgentChat';
import { EditorTabs } from './editor/EditorTabs';
import { AgentTimeline } from './panels/AgentTimeline';
import { Terminal } from './panels/Terminal';
import { StatusBar } from './layout/StatusBar';
import { ResizablePanel } from './layout/ResizablePanel';
import { Terminal as TerminalIcon, Bot, GitBranch, Cpu, Wifi, Settings, ChevronDown, Sparkles } from 'lucide-react';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  gitStatus?: 'added' | 'modified' | 'deleted' | 'none';
  language?: string;
}

interface Tab {
  id: string;
  name: string;
  language: string;
  path?: string;
  isModified: boolean;
  isActive: boolean;
}

interface TimelineEvent {
  id: string;
  agent: 'retriever' | 'planner' | 'coder' | 'reviewer' | 'reflection';
  status: 'pending' | 'running' | 'completed' | 'error';
  title: string;
  description?: string;
  timestamp: string;
}

export const Workspace: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<FileNode | undefined>();
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', name: 'App.tsx', language: 'typescript', path: 'src', isModified: true, isActive: true },
    { id: '2', name: 'main.tsx', language: 'typescript', path: 'src', isModified: false, isActive: false },
  ]);
  const [code, setCode] = useState<string>(`import React from 'react';
import { Workspace } from './components/Workspace';

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Workspace />
    </div>
  );
}

export default App;`);

  const [timelineEvents] = useState<TimelineEvent[]>([
    {
      id: '1',
      agent: 'retriever',
      status: 'completed',
      title: 'Retrieved context',
      description: 'Found 3 relevant code snippets',
      timestamp: '11:42:15'
    },
    {
      id: '2',
      agent: 'planner',
      status: 'completed',
      title: 'Generated plan',
      description: 'Created 4-step implementation plan',
      timestamp: '11:42:18'
    },
  ]);

  const [activePanel, setActivePanel] = useState<'timeline' | 'terminal' | 'chat'>('chat');

  const handleFileSelect = (file: FileNode) => {
    setSelectedFile(file);
    if (file.type === 'file') {
      const existingTab = tabs.find(t => t.name === file.name);
      if (existingTab) {
        setTabs(tabs.map(t => ({ ...t, isActive: t.id === existingTab.id })));
      } else {
        setTabs([...tabs.map(t => ({ ...t, isActive: false })), {
          id: String(Date.now()),
          name: file.name,
          language: file.language || 'typescript',
          isModified: false,
          isActive: true
        }]);
      }
    }
  };

  const handleTabClose = (id: string) => {
    const newTabs = tabs.filter(t => t.id !== id);
    if (tabs.find(t => t.id === id)?.isActive && newTabs.length > 0) {
      newTabs[0].isActive = true;
    }
    setTabs(newTabs);
  };

  const handleTabSelect = (id: string) => {
    setTabs(tabs.map(t => ({ ...t, isActive: t.id === id })));
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Navigation Bar */}
      <div className="h-12 border-b border-border bg-background-elevated flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {/* Repository Info */}
          <div className="flex items-center gap-2">
            <GitBranch size={16} className="text-primary" />
            <span className="text-sm font-medium text-text-primary">ai-coding-agent</span>
            <div className="flex items-center gap-1 bg-background px-2 py-1 rounded-md border border-border">
              <span className="text-xs text-text-secondary">main</span>
              <ChevronDown size={12} className="text-text-muted" />
            </div>
          </div>

          {/* Model Selector */}
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-warning" />
            <div className="flex items-center gap-1 bg-background px-2 py-1 rounded-md border border-border">
              <span className="text-xs text-text-primary">Gemini 1.5 Pro</span>
              <ChevronDown size={12} className="text-text-muted" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <Wifi size={14} className="text-success" />
            <span className="text-xs text-text-muted">Connected</span>
          </div>

          {/* System Status */}
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-info" />
            <span className="text-xs text-text-muted">Backend: Online</span>
          </div>

          {/* Settings */}
          <button className="p-2 hover:bg-background-hover rounded-md transition-colors text-text-muted hover:text-text-primary">
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - File Explorer */}
        <ResizablePanel
          direction="horizontal"
          defaultSize={260}
          minSize={180}
          maxSize={400}
          className="border-r border-border"
        >
          <FileTree onFileSelect={handleFileSelect} selectedFile={selectedFile} />
        </ResizablePanel>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor Tabs */}
          <EditorTabs
            tabs={tabs}
            onTabClose={handleTabClose}
            onTabSelect={handleTabSelect}
          />

          {/* Monaco Editor */}
          <div className="flex-1 relative">
            <Editor
              height="100%"
              defaultLanguage="typescript"
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                padding: { top: 16 },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                renderLineHighlight: 'all',
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                smoothScrolling: true,
                bracketPairColorization: { enabled: true },
              }}
            />
          </div>

          {/* Bottom Panel */}
          <ResizablePanel
            direction="vertical"
            defaultSize={200}
            minSize={120}
            maxSize={400}
            className="border-t border-border"
          >
            {/* Panel Tabs */}
            <div className="flex items-center border-b border-border bg-background-elevated">
              <button
                onClick={() => setActivePanel('timeline')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors ${
                  activePanel === 'timeline'
                    ? 'text-text-primary border-b-2 border-b-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Bot size={14} />
                Agent Timeline
              </button>
              <button
                onClick={() => setActivePanel('terminal')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors ${
                  activePanel === 'terminal'
                    ? 'text-text-primary border-b-2 border-b-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <TerminalIcon size={14} />
                Terminal
              </button>
            </div>

            {/* Panel Content */}
            {activePanel === 'timeline' && (
              <AgentTimeline events={timelineEvents} />
            )}
            {activePanel === 'terminal' && <Terminal />}
          </ResizablePanel>
        </div>

        {/* Right Panel - AI Chat */}
        <ResizablePanel
          direction="horizontal"
          defaultSize={380}
          minSize={300}
          maxSize={600}
          className="border-l border-border"
        >
          <AgentChat />
        </ResizablePanel>
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
};
