import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Send, Bot, Sparkles, RotateCcw, Copy, Check, Loader2, Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, Terminal as TerminalIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ChatMessage, SocketStatus, TimelineEvent } from '../../hooks/useAgentSocket';

interface AgentChatProps {
  messages: ChatMessage[];
  timeline?: TimelineEvent[];
  status: SocketStatus;
  running: boolean;
  onSend: (message: string) => void;
  onReset: () => void;
  onCancel: () => void;
}

const nodeBadgeColor: Record<string, string> = {
  retriever: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  planner: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  coder: 'bg-green-500/20 text-green-400 border-green-500/30',
  reviewer: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  reflection: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

const statusIcons = {
  pending: Clock,
  running: Loader2,
  completed: CheckCircle2,
  error: AlertCircle,
};

const statusColors = {
  pending: 'text-text-muted',
  running: 'text-primary animate-spin',
  completed: 'text-success',
  error: 'text-error',
};

export const AgentChat: React.FC<AgentChatProps> = ({
  messages,
  timeline = [],
  status,
  running,
  onSend,
  onReset,
  onCancel,
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTimelines, setExpandedTimelines] = useState<Set<string>>(new Set());
  const endRef = useRef<HTMLDivElement>(null);

  const isConnected = status === 'connected';

  const combinedItems = useMemo(() => {
    const items: Array<{ type: 'message', data: ChatMessage } | { type: 'timeline', data: TimelineEvent }> = [
      ...messages.map(m => ({ type: 'message' as const, data: m })),
      ...timeline.map(t => ({ type: 'timeline' as const, data: t }))
    ];
    
    return items.map((item, index) => ({ ...item, index })).sort((a, b) => {
      const timeA = a.data.timestamp;
      const timeB = b.data.timestamp;
      if (timeA === timeB) return a.index - b.index;
      return timeA.localeCompare(timeB);
    });
  }, [messages, timeline]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [combinedItems, running]);

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
  
  const toggleTimeline = (id: string) => {
    setExpandedTimelines(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-background-panel text-sm font-sans">
      {/* Header */}
      <div className="px-4 h-[44px] flex items-center justify-between border-b border-border bg-background-elevated shrink-0 z-10 select-none">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-6 h-6 rounded-md bg-background border border-border shadow-sm">
            <Bot size={14} className="text-primary" />
            <Sparkles size={8} className="absolute -top-1 -right-1 text-warning animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-semibold text-text-primary leading-tight block">
              AI Assistant
            </span>
            <div className="flex items-center gap-1.5 mt-[1px]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-success shadow-[0_0_4px_rgba(34,197,94,0.5)]' : status === 'connecting' ? 'bg-warning animate-pulse' : 'bg-error'
                }`}
              />
              <span className="text-[10px] text-text-muted capitalize font-medium">{status}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onReset}
          className="icon-btn text-text-muted hover:text-text-primary"
          title="Clear conversation"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Messages & Timeline */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-background">
        {combinedItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-text-muted py-10 px-4">
            <div className="w-12 h-12 rounded-xl bg-background-elevated flex items-center justify-center mb-4 border border-border shadow-sm">
              <Bot size={24} className="text-primary" />
            </div>
            <p className="text-sm font-semibold text-text-primary mb-1">How can I help you code?</p>
            <p className="text-xs max-w-[200px] leading-relaxed mb-6">Ask the agent to modify code, explain files, or find bugs.</p>
            
            <div className="flex flex-col gap-2 w-full max-w-[240px]">
              <button 
                onClick={() => onSend('Explain how the current active file works.')}
                className="text-xs text-left px-3 py-2 bg-background-elevated border border-border hover:border-primary/50 hover:bg-bg-hover rounded-lg transition-all"
              >
                Explain active file
              </button>
              <button 
                onClick={() => onSend('Find any potential bugs or security issues in this repository.')}
                className="text-xs text-left px-3 py-2 bg-background-elevated border border-border hover:border-primary/50 hover:bg-bg-hover rounded-lg transition-all"
              >
                Find bugs in the repo
              </button>
              <button 
                onClick={() => onSend('Refactor this component to use modern React patterns and Tailwind.')}
                className="text-xs text-left px-3 py-2 bg-background-elevated border border-border hover:border-primary/50 hover:bg-bg-hover rounded-lg transition-all"
              >
                Refactor code
              </button>
            </div>
          </div>
        )}

        {combinedItems.map(({ type, data }) => {
          if (type === 'message') {
            const msg = data as ChatMessage;
            if (msg.kind === 'user') {
              return (
                <div key={msg.id} className="flex flex-col items-end gap-1 flex-row-reverse animate-fade-in group w-full pl-8 mb-2">
                  <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-[13px] bg-primary text-white shadow-sm border border-primary-active inline-block max-w-[90%] text-left">
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  </div>
                </div>
              );
            }
            if (msg.kind === 'system') {
              return (
                <div key={msg.id} className="flex justify-center animate-fade-in my-3">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-text-muted bg-background-elevated border border-border rounded-full px-3 py-1 shadow-sm">
                    {msg.content}
                  </span>
                </div>
              );
            }
            if (msg.kind === 'error') {
              return (
                <div
                  key={msg.id}
                  className="text-xs text-error bg-error/10 border border-error/20 rounded-xl px-4 py-3 animate-fade-in shadow-sm w-full pr-8"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle size={14} />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Error</span>
                  </div>
                  {msg.content}
                </div>
              );
            }
            // Agent message
            return (
              <div key={msg.id} className="flex gap-3 animate-fade-in group w-full pr-8">
                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-primary/10 border border-primary/20 text-primary shadow-sm">
                  <Bot size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-text-primary leading-relaxed bg-background-elevated/40 border border-border/60 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm inline-block w-full">
                    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({node, inline, className, children, ...props}: any) {
                            const match = /language-(\w+)/.exec(className || '')
                            return !inline && match ? (
                              <div className="relative group/code">
                                <SyntaxHighlighter
                                  {...props}
                                  children={String(children).replace(/\n$/, '')}
                                  style={vscDarkPlus}
                                  language={match[1]}
                                  PreTag="div"
                                  className="rounded-lg !my-3 !bg-[#0E1116] border border-border !text-[12px] shadow-sm"
                                />
                                <button
                                  onClick={() => navigator.clipboard.writeText(String(children))}
                                  className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 p-1.5 rounded-md bg-background-elevated border border-border text-text-muted hover:text-text-primary transition-all shadow-sm"
                                  title="Copy code"
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                            ) : (
                              <code {...props} className="bg-background-elevated px-1.5 py-0.5 rounded-md text-[11.5px] font-mono border border-border text-primary">
                                {children}
                              </code>
                            )
                          },
                          p({children}) { return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p> },
                          ul({children}) { return <ul className="list-disc pl-4 mb-2">{children}</ul> },
                          ol({children}) { return <ol className="list-decimal pl-4 mb-2">{children}</ol> },
                          a({children, href}) { return <a href={href} className="text-primary hover:underline">{children}</a> }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-text-muted font-medium">{msg.timestamp}</span>
                    <button
                      onClick={() => copy(msg.content, msg.id)}
                      className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
                      title="Copy message"
                    >
                      {copiedId === msg.id ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          } else {
            // Timeline event (Agent Reasoning)
            const evt = data as TimelineEvent;
            const StatusIcon = statusIcons[evt.status];
            const isExpanded = expandedTimelines.has(evt.id);
            
            return (
              <div key={evt.id} className="flex gap-3 animate-fade-in ml-[11px] group pr-8">
                <div className="flex flex-col items-center">
                  <div className="w-[1.5px] h-2 bg-border"></div>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                    evt.status === 'completed' ? 'bg-success/10 border border-success/20' :
                    evt.status === 'error' ? 'bg-error/10 border border-error/20' :
                    evt.status === 'running' ? 'bg-primary/10 border border-primary/20' :
                    'bg-background-elevated border border-border'
                  }`}>
                    <StatusIcon size={10} className={statusColors[evt.status]} />
                  </div>
                  <div className="w-[1.5px] flex-1 bg-border mt-1 min-h-[12px]"></div>
                </div>
                
                <div className="flex-1 min-w-0 pb-1 pt-[2px]">
                  <div 
                    className="inline-flex items-center gap-2 cursor-pointer"
                    onClick={() => toggleTimeline(evt.id)}
                  >
                    <span className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
                      {evt.title}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold ${nodeBadgeColor[evt.agent] || 'bg-background-elevated text-text-muted border-border'}`}>
                      {evt.agent}
                    </span>
                    {evt.description && (
                      <span className="text-text-muted">
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </span>
                    )}
                  </div>
                  {evt.description && isExpanded && (
                    <div className="mt-2 text-[11.5px] text-text-muted bg-background-elevated/50 p-3 rounded-lg border border-border/80 inline-block max-w-full overflow-hidden text-ellipsis shadow-sm font-mono">
                      <div className="flex items-center gap-1.5 mb-1.5 text-text-primary font-sans font-semibold">
                        <TerminalIcon size={12} /> Action details
                      </div>
                      {evt.description}
                    </div>
                  )}
                </div>
              </div>
            );
          }
        })}
        
        {running && (
          <div className="flex gap-3 animate-fade-in pr-8 w-full">
             <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-primary/10 border border-primary/20 text-primary shadow-sm">
                <Bot size={13} />
             </div>
             <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl rounded-tl-sm text-[12px] bg-background-elevated border border-border text-text-primary shadow-sm">
                <Loader2 size={12} className="animate-spin text-primary" />
                <span className="text-text-muted font-medium">Agent is thinking...</span>
             </div>
          </div>
        )}
        <div ref={endRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background z-10 shrink-0 relative">
        {running && (
          <div className="absolute -top-6 left-0 right-0 flex justify-center pointer-events-none">
            <button
              onClick={onCancel}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 bg-background-elevated hover:bg-error/10 border border-border hover:border-error/50 text-text-muted hover:text-error text-[11px] font-bold uppercase tracking-wider rounded-full shadow-md transition-all"
            >
              <div className="w-2 h-2 bg-error rounded-sm shrink-0" />
              Stop Generating
            </button>
          </div>
        )}
        <div className="flex flex-col bg-background-elevated border border-border rounded-xl focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all shadow-sm">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isConnected ? 'Message the AI...' : 'Connecting...'}
            className="w-full bg-transparent border-none outline-none text-text-primary placeholder-text-muted text-[13px] resize-none min-h-[60px] max-h-[200px] p-3 rounded-t-xl"
            rows={2}
          />
          <div className="flex items-center justify-between px-3 pb-2 pt-1">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-background border border-border hover:border-primary/30 transition-colors shadow-sm cursor-pointer group">
              <Sparkles size={11} className="text-primary group-hover:animate-pulse" />
              <select
                className="bg-transparent border-none outline-none text-[10px] font-bold uppercase tracking-wider text-text-secondary group-hover:text-text-primary cursor-pointer appearance-none pr-1"
                defaultValue={localStorage.getItem('llm_provider') || 'gemini'}
                onChange={(e) => localStorage.setItem('llm_provider', e.target.value)}
                title="Select AI Model"
              >
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Claude</option>
              </select>
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || !isConnected}
              className="p-1.5 bg-primary hover:bg-primary-active disabled:bg-background disabled:text-text-muted disabled:border disabled:border-border text-white rounded-lg transition-all shadow-sm"
              title="Send (Enter)"
            >
              <Send size={14} className={!input.trim() || !isConnected ? '' : 'translate-x-[1px] -translate-y-[1px]'} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
