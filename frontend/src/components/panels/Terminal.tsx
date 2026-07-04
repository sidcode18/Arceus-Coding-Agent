import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, ChevronDown, Play, Square, Terminal as TerminalIcon, AlertTriangle, Info, XCircle } from 'lucide-react';

interface TerminalTab {
  id: string;
  name: string;
  type: 'shell' | 'python' | 'node';
  isActive: boolean;
}

interface TerminalOutput {
  id: string;
  type: 'command' | 'output' | 'error' | 'success';
  content: string;
  timestamp: string;
}

interface LogEntry {
  id: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  timestamp: string;
  source: string;
}

interface Problem {
  id: string;
  type: 'error' | 'warning' | 'info';
  file: string;
  line: number;
  message: string;
  code?: string;
}

export const Terminal: React.FC = () => {
  const [activePanel, setActivePanel] = useState<'terminal' | 'logs' | 'problems'>('terminal');
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: '1', name: 'Shell', type: 'shell', isActive: true },
  ]);
  const [outputs, setOutputs] = useState<Record<string, TerminalOutput[]>>({
    '1': [
      { id: '1', type: 'command', content: 'npm run dev', timestamp: '11:42:15' },
      { id: '2', type: 'success', content: 'VITE v8.1.3 ready in 342ms', timestamp: '11:42:16' },
      { id: '3', type: 'output', content: '➜ Local: http://localhost:5173/', timestamp: '11:42:16' },
    ],
  });
  const [logs] = useState<LogEntry[]>([
    { id: '1', level: 'info', message: 'Application started successfully', timestamp: new Date().toLocaleTimeString(), source: 'app' },
    { id: '2', level: 'debug', message: 'WebSocket connection established', timestamp: new Date().toLocaleTimeString(), source: 'websocket' },
    { id: '3', level: 'warning', message: 'High memory usage detected', timestamp: new Date().toLocaleTimeString(), source: 'system' },
  ]);
  const [problems] = useState<Problem[]>([
    { id: '1', type: 'error', file: 'src/App.tsx', line: 42, message: 'Unused variable "unusedVar"', code: 'ESLint' },
    { id: '2', type: 'warning', file: 'src/utils/helpers.ts', line: 15, message: 'Function has no return type', code: 'TypeScript' },
    { id: '3', type: 'info', file: 'package.json', line: 8, message: 'Dependency update available', code: 'npm' },
  ]);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find(t => t.isActive) || tabs[0];

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [outputs, logs]);

  const handleAddTab = () => {
    const newId = String(tabs.length + 1);
    setTabs([...tabs.map(t => ({ ...t, isActive: false })), { id: newId, name: `Terminal ${newId}`, type: 'shell', isActive: true }]);
  };

  const handleTabClose = (id: string) => {
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(t => t.id !== id);
    if (activeTab?.id === id) {
      newTabs[0].isActive = true;
    }
    setTabs(newTabs);
  };

  const handleTabSelect = (id: string) => {
    setTabs(tabs.map(t => ({ ...t, isActive: t.id === id })));
  };

  const handleCommand = () => {
    if (!input.trim() || !activeTab) return;
    
    const newOutput: TerminalOutput = {
      id: String(Date.now()),
      type: 'command',
      content: input,
      timestamp: new Date().toLocaleTimeString(),
    };

    setOutputs({
      ...outputs,
      [activeTab.id]: [...(outputs[activeTab.id] || []), newOutput],
    });
    setInput('');
  };

  const outputColors = {
    command: 'text-primary',
    output: 'text-text-primary',
    error: 'text-error',
    success: 'text-success',
  };

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return <XCircle size={12} className="text-error" />;
      case 'warning': return <AlertTriangle size={12} className="text-warning" />;
      default: return <Info size={12} className="text-info" />;
    }
  };

  const getProblemIcon = (type: Problem['type']) => {
    switch (type) {
      case 'error': return <XCircle size={12} className="text-error" />;
      case 'warning': return <AlertTriangle size={12} className="text-warning" />;
      default: return <Info size={12} className="text-info" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background-panel">
      {/* Panel Tabs */}
      <div className="flex items-center border-b border-border bg-background-elevated">
        <button
          onClick={() => setActivePanel('terminal')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors border-r border-border ${
            activePanel === 'terminal'
              ? 'text-text-primary bg-background'
              : 'text-text-muted hover:text-text-primary hover:bg-background-hover'
          }`}
        >
          <TerminalIcon size={12} />
          Terminal
        </button>
        <button
          onClick={() => setActivePanel('logs')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors border-r border-border ${
            activePanel === 'logs'
              ? 'text-text-primary bg-background'
              : 'text-text-muted hover:text-text-primary hover:bg-background-hover'
          }`}
        >
          <Info size={12} />
          Logs
          <span className="text-xs bg-background-elevated px-1.5 py-0.5 rounded">{logs.length}</span>
        </button>
        <button
          onClick={() => setActivePanel('problems')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors ${
            activePanel === 'problems'
              ? 'text-text-primary bg-background'
              : 'text-text-muted hover:text-text-primary hover:bg-background-hover'
          }`}
        >
          <AlertTriangle size={12} />
          Problems
          <span className="text-xs bg-background-elevated px-1.5 py-0.5 rounded">{problems.length}</span>
        </button>
      </div>

      {/* Terminal Panel */}
      {activePanel === 'terminal' && (
        <>
          {/* Terminal Tabs */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background">
            <div className="flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    tab.isActive
                      ? 'bg-background-elevated text-text-primary'
                      : 'text-text-secondary hover:bg-background-elevated hover:text-text-primary'
                  }`}
                  onClick={() => handleTabSelect(tab.id)}
                >
                  <span className="text-primary">_</span>
                  {tab.name}
                  <button
                    className="ml-1 hover:text-error transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTabClose(tab.id);
                    }}
                  >
                    <X size={10} />
                  </button>
                </button>
              ))}
              <button
                className="p-1.5 hover:bg-background-hover rounded-md transition-colors text-text-muted hover:text-text-primary"
                onClick={handleAddTab}
              >
                <Plus size={14} />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="p-1.5 hover:bg-background-hover rounded-md transition-colors text-text-muted hover:text-success">
                <Play size={14} />
              </button>
              <button className="p-1.5 hover:bg-background-hover rounded-md transition-colors text-text-muted hover:text-error">
                <Square size={14} />
              </button>
              <button className="p-1.5 hover:bg-background-hover rounded-md transition-colors text-text-muted hover:text-text-primary">
                <ChevronDown size={14} />
              </button>
            </div>
          </div>

          {/* Output */}
          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1">
            {activeTab && outputs[activeTab.id]?.map((output) => (
              <div key={output.id} className="flex gap-2">
                <span className="text-text-muted shrink-0">{output.timestamp}</span>
                <span className={outputColors[output.type]}>{output.content}</span>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t border-border bg-background-elevated">
            <div className="flex items-center gap-2 bg-background border border-border rounded-md px-3 py-2">
              <span className="text-primary font-mono text-xs">$</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
                placeholder="Type a command..."
                className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder-text-muted font-mono text-xs"
              />
            </div>
          </div>
        </>
      )}

      {/* Logs Panel */}
      {activePanel === 'logs' && (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 p-2 rounded bg-background-elevated hover:bg-background-hover transition-colors">
                {getLogIcon(log.level)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-primary">{log.source}</span>
                    <span className="text-xs text-text-muted">{log.timestamp}</span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{log.message}</p>
                </div>
              </div>
            ))}
          </div>
          <div ref={scrollRef} />
        </div>
      )}

      {/* Problems Panel */}
      {activePanel === 'problems' && (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {problems.map((problem) => (
              <div key={problem.id} className="flex items-start gap-2 p-2 rounded bg-background-elevated hover:bg-background-hover transition-colors cursor-pointer">
                {getProblemIcon(problem.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-primary">{problem.file}</span>
                    <span className="text-xs text-text-muted">:{problem.line}</span>
                    {problem.code && (
                      <span className="text-xs bg-background-border px-1.5 py-0.5 rounded text-text-muted">{problem.code}</span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{problem.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
