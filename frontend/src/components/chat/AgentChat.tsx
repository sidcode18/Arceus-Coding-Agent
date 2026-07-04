import React, { useEffect, useRef, useState } from 'react';
import { Send, Bot, User, Sparkles, RotateCcw, Copy, Check, Loader2 } from 'lucide-react';
import type { ChatMessage, SocketStatus } from '../../hooks/useAgentSocket';

interface AgentChatProps {
  messages: ChatMessage[];
  status: SocketStatus;
  running: boolean;
  onSend: (message: string) => void;
  onReset: () => void;
}

const nodeBadgeColor: Record<string, string> = {
  retriever: 'bg-purple-500',
  planner: 'bg-blue-500',
  coder: 'bg-green-500',
  reviewer: 'bg-orange-500',
  reflection: 'bg-pink-500',
};

export const AgentChat: React.FC<AgentChatProps> = ({
  messages,
  status,
  running,
  onSend,
  onReset,
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const isConnected = status === 'connected';

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const value = input.trim();
    if (!value || !isConnected) return;
    onSend(value);
    setInput('');
  };

  const copy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex flex-col h-full bg-background-panel">
      {/* Header */}
      <div className="px-3 h-11 flex items-center justify-between border-b border-border bg-background-elevated">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot size={18} className="text-primary" />
            <Sparkles size={10} className="absolute -top-1 -right-1 text-warning" />
          </div>
          <div>
            <span className="text-sm font-semibold text-text-primary leading-tight block">
              AI Assistant
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-success animate-pulse' : status === 'connecting' ? 'bg-warning' : 'bg-error'
                }`}
              />
              <span className="text-xs text-text-muted capitalize">{status}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onReset}
          className="p-1.5 hover:bg-background-hover rounded-md transition-colors text-text-muted hover:text-text-primary"
          title="Clear conversation"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-text-muted py-10">
            <Bot size={28} className="mx-auto mb-2 opacity-60" />
            <p className="text-sm">Ask the agent to modify code in this workspace.</p>
            <p className="text-xs mt-1">
              e.g. “Add a docstring to the main function in app.py”
            </p>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.kind === 'user') {
            return (
              <div key={msg.id} className="flex gap-3 flex-row-reverse animate-fade-in">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-primary to-primary-active text-white">
                  <User size={14} />
                </div>
                <div className="max-w-[85%] px-3 py-2 rounded-lg text-sm bg-gradient-to-br from-primary to-primary-active text-white">
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                </div>
              </div>
            );
          }
          if (msg.kind === 'system') {
            return (
              <div key={msg.id} className="flex justify-center animate-fade-in">
                <span className="text-xs text-text-muted bg-background-elevated border border-border rounded-full px-3 py-1">
                  {msg.content}
                </span>
              </div>
            );
          }
          if (msg.kind === 'error') {
            return (
              <div
                key={msg.id}
                className="text-xs text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2 animate-fade-in"
              >
                {msg.content}
              </div>
            );
          }
          // agent / node message
          return (
            <div key={msg.id} className="flex gap-3 animate-fade-in group">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-background-elevated border border-border text-primary">
                <Bot size={14} />
              </div>
              <div className="max-w-[85%] min-w-0">
                {msg.node && (
                  <span
                    className={`badge text-white ${nodeBadgeColor[msg.node] || 'bg-primary'} mb-1 inline-block`}
                  >
                    {msg.node}
                  </span>
                )}
                <div className="px-3 py-2 rounded-lg text-sm bg-background-elevated border border-border text-text-primary">
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-text-muted">{msg.timestamp}</span>
                  <button
                    onClick={() => copy(msg.content, msg.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-muted hover:text-text-primary transition"
                    title="Copy"
                  >
                    {copiedId === msg.id ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {running && (
          <div className="flex items-center gap-2 text-xs text-text-muted animate-fade-in">
            <Loader2 size={12} className="animate-spin" /> Agents working…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-background-elevated">
        <div className="flex items-end gap-2 bg-background border border-border rounded-lg p-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isConnected ? 'Ask the AI to modify code… (Shift+Enter for newline)' : 'Connecting…'}
            className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder-text-muted text-sm resize-none min-h-[38px] max-h-[120px] py-1.5"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !isConnected}
            className="p-2 bg-primary hover:bg-primary-hover disabled:bg-background-border disabled:cursor-not-allowed text-white rounded-md transition-all shrink-0"
            title="Send (Enter)"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-xs text-text-muted">
            <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-text-secondary">
              Enter
            </kbd>{' '}
            to send
          </span>
          <span className="text-xs text-text-muted">Powered by Gemini</span>
        </div>
      </div>
    </div>
  );
};
