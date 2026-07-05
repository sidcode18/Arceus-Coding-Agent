import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_BASE } from '../api/client';
import type { AgentEvent, AgentNode, CodeChange, TerminalResult } from '../api/types';

export type SocketStatus = 'connecting' | 'connected' | 'disconnected';

export interface ChatMessage {
  id: string;
  kind: 'user' | 'system' | 'node' | 'agent' | 'error';
  node?: string;
  content: string;
  timestamp: string;
}

export interface TimelineEvent {
  id: string;
  agent: AgentNode;
  status: 'pending' | 'running' | 'completed' | 'error';
  title: string;
  description?: string;
  timestamp: string;
}

export interface AgentCommandLog extends TerminalResult {
  command: string;
}

const KNOWN_NODES: AgentNode[] = ['retriever', 'planner', 'coder', 'reviewer', 'reflection'];

function now(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface UseAgentSocketResult {
  status: SocketStatus;
  running: boolean;
  messages: ChatMessage[];
  timeline: TimelineEvent[];
  pendingChanges: CodeChange[];
  commandLogs: AgentCommandLog[];
  send: (message: string, projectId: string) => boolean;
  dismissChange: (filePath: string) => void;
  clearChanges: () => void;
  reset: () => void;
}

export function useAgentSocket(sessionId: string): UseAgentSocketResult {
  const [status, setStatus] = useState<SocketStatus>('connecting');
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [pendingChanges, setPendingChanges] = useState<CodeChange[]>([]);
  const [commandLogs, setCommandLogs] = useState<AgentCommandLog[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedByUs = useRef(false);

  const pushMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages((prev) => [...prev, { ...msg, id: uid(), timestamp: now() }]);
  }, []);

  const handleEvent = useCallback(
    (evt: AgentEvent) => {
      switch (evt.event) {
        case 'workflow_started': {
          setRunning(true);
          setTimeline([]);
          setPendingChanges([]);
          pushMessage({ kind: 'system', content: 'Starting workflow execution…' });
          break;
        }
        case 'node_update': {
          const node = evt.node as AgentNode;
          const hasError = evt.state?.errors?.length > 0;
          setTimeline((prev) => {
            const marked = prev.map((e) =>
              e.status === 'running' ? { ...e, status: 'completed' as const } : e,
            );
            const description =
              (hasError && evt.state.errors.join('; ')) ||
              evt.state.review_status ||
              evt.state.reflection_action ||
              (evt.state.plan_steps?.length ? `${evt.state.plan_steps.length} step(s) planned` : '') ||
              undefined;
            return [
              ...marked,
              {
                id: uid(),
                agent: KNOWN_NODES.includes(node) ? node : 'coder',
                status: hasError ? 'error' : 'running',
                title: node.charAt(0).toUpperCase() + node.slice(1),
                description,
                timestamp: now(),
              },
            ];
          });

          const writes = (evt.state?.code_changes || []).filter(
            (c) => c.tool === 'write_file' && c.file_path,
          );
          if (writes.length) {
            setPendingChanges((prev) => {
              const byPath = new Map(prev.map((c) => [c.file_path, c]));
              for (const w of writes) byPath.set(w.file_path, w);
              return Array.from(byPath.values());
            });
          }
          const commands = (evt.state?.code_changes || []).filter(
            (c) => c.tool === 'run_command' && c.result && typeof c.result === 'object',
          );
          if (commands.length) {
            setCommandLogs((prev) => [
              ...prev,
              ...commands.map((c) => ({
                command: c.command,
                ...(c.result as TerminalResult),
              })),
            ]);
          }
          break;
        }
        case 'message_update': {
          if (evt.content && evt.content.trim()) {
            pushMessage({ kind: 'agent', node: evt.node, content: evt.content });
          }
          break;
        }
        case 'workflow_completed': {
          setRunning(false);
          setTimeline((prev) =>
            prev.map((e) => (e.status === 'running' ? { ...e, status: 'completed' as const } : e)),
          );
          const m = evt.metrics;
          const summary = m
            ? `Workflow completed — ${m.iteration_count} iteration(s), ${m.retry_count} retry(s), ${m.execution_time}s.`
            : 'Workflow completed successfully.';
          pushMessage({ kind: 'system', content: summary });
          break;
        }
        case 'workflow_terminated': {
          setRunning(false);
          setTimeline((prev) =>
            prev.map((e) => (e.status === 'running' ? { ...e, status: 'error' as const } : e)),
          );
          pushMessage({
            kind: 'error',
            content: `Workflow stopped (${evt.reason}): ${evt.detail}`,
          });
          break;
        }
        case 'error': {
          setRunning(false);
          setTimeline((prev) =>
            prev.map((e) => (e.status === 'running' ? { ...e, status: 'error' as const } : e)),
          );
          pushMessage({ kind: 'error', content: evt.message });
          break;
        }
      }
    },
    [pushMessage],
  );

  const connect = useCallback(() => {
    const url = `${WS_BASE}/api/v1/websocket/ws/${sessionId}`;
    setStatus('connecting');
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setStatus('connected');
    ws.onclose = () => {
      setStatus('disconnected');
      if (!closedByUs.current) {
        reconnectTimer.current = setTimeout(connect, 2000);
      }
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (e) => {
      try {
        handleEvent(JSON.parse(e.data) as AgentEvent);
      } catch {
        /* ignore malformed frame */
      }
    };
  }, [sessionId, handleEvent]);

  useEffect(() => {
    closedByUs.current = false;
    connect();
    return () => {
      closedByUs.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback(
    (message: string, projectId: string): boolean => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return false;
      pushMessage({ kind: 'user', content: message });
      ws.send(JSON.stringify({ message, project_id: projectId }));
      return true;
    },
    [pushMessage],
  );

  const dismissChange = useCallback((filePath: string) => {
    setPendingChanges((prev) => prev.filter((c) => c.file_path !== filePath));
  }, []);

  const clearChanges = useCallback(() => setPendingChanges([]), []);

  const reset = useCallback(() => {
    setMessages([]);
    setTimeline([]);
    setPendingChanges([]);
    setCommandLogs([]);
  }, []);

  return {
    status,
    running,
    messages,
    timeline,
    pendingChanges,
    commandLogs,
    send,
    dismissChange,
    clearChanges,
    reset,
  };
}
