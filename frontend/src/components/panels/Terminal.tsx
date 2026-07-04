import React, { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, Loader2, Trash2, Bot } from 'lucide-react';
import { api, extractError } from '../../api/client';
import type { AgentCommandLog } from '../../hooks/useAgentSocket';

interface TerminalProps {
  projectId: string;
  agentLogs: AgentCommandLog[];
}

interface Line {
  id: string;
  type: 'command' | 'output' | 'error' | 'success' | 'agent';
  content: string;
  timestamp: string;
}

const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const Terminal: React.FC<TerminalProps> = ({ projectId, agentLogs }) => {
  const [lines, setLines] = useState<Line[]>([
    { id: uid(), type: 'success', content: `Workspace shell ready — commands run inside the cloned repository.`, timestamp: now() },
  ]);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const processedAgentLogs = useRef(0);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  // Append newly-arrived agent command executions.
  useEffect(() => {
    if (agentLogs.length <= processedAgentLogs.current) return;
    const fresh = agentLogs.slice(processedAgentLogs.current);
    processedAgentLogs.current = agentLogs.length;
    const newLines: Line[] = [];
    for (const log of fresh) {
      newLines.push({ id: uid(), type: 'agent', content: `agent $ ${log.command}`, timestamp: now() });
      if (log.stdout?.trim()) newLines.push({ id: uid(), type: 'output', content: log.stdout.trimEnd(), timestamp: now() });
      if (log.stderr?.trim()) newLines.push({ id: uid(), type: 'error', content: log.stderr.trimEnd(), timestamp: now() });
    }
    setLines((prev) => [...prev, ...newLines]);
  }, [agentLogs]);

  const runCommand = async () => {
    const command = input.trim();
    if (!command || running) return;
    setInput('');
    setLines((prev) => [...prev, { id: uid(), type: 'command', content: `$ ${command}`, timestamp: now() }]);
    setRunning(true);
    try {
      const result = await api.runCommand(projectId, command);
      const out: Line[] = [];
      if (result.stdout?.trim()) out.push({ id: uid(), type: 'output', content: result.stdout.trimEnd(), timestamp: now() });
      if (result.stderr?.trim()) out.push({ id: uid(), type: 'error', content: result.stderr.trimEnd(), timestamp: now() });
      out.push({
        id: uid(),
        type: result.exit_code === 0 ? 'success' : 'error',
        content: `exit code ${result.exit_code}`,
        timestamp: now(),
      });
      setLines((prev) => [...prev, ...out]);
    } catch (err) {
      setLines((prev) => [...prev, { id: uid(), type: 'error', content: extractError(err), timestamp: now() }]);
    } finally {
      setRunning(false);
    }
  };

  const colors: Record<Line['type'], string> = {
    command: 'text-primary',
    output: 'text-text-primary',
    error: 'text-error',
    success: 'text-success',
    agent: 'text-warning',
  };

  return (
    <div className="flex flex-col h-full bg-background-panel">
      <div className="flex items-center justify-between px-3 h-8 border-b border-border bg-background-elevated">
        <div className="flex items-center gap-2 text-xs font-medium text-text-primary">
          <TerminalIcon size={13} /> Terminal
        </div>
        <button
          onClick={() => setLines([])}
          className="p-1 hover:bg-background-hover rounded transition-colors text-text-muted hover:text-text-primary"
          title="Clear"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1">
        {lines.map((line) => (
          <div key={line.id} className="flex gap-2">
            <span className="text-text-muted shrink-0">{line.timestamp}</span>
            {line.type === 'agent' && <Bot size={12} className="text-warning shrink-0 mt-0.5" />}
            <span className={`${colors[line.type]} whitespace-pre-wrap break-all`}>{line.content}</span>
          </div>
        ))}
        {running && (
          <div className="flex items-center gap-2 text-text-muted">
            <Loader2 size={12} className="animate-spin" /> running…
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-2 border-t border-border bg-background-elevated">
        <div className="flex items-center gap-2 bg-background border border-border rounded-md px-3 py-2 focus-within:border-primary transition-colors">
          <span className="text-primary font-mono text-xs">$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runCommand()}
            placeholder="Run a command in the workspace…"
            disabled={running}
            className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder-text-muted font-mono text-xs disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );
};
