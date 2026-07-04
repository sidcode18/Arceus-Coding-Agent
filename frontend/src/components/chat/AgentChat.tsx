import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, MoreVertical, Copy, Check, Play, RotateCcw, CheckCircle, XCircle, Clock, FileDiff, ChevronDown, ChevronRight } from 'lucide-react';

interface Message {
  id: string;
  role: 'agent' | 'user';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  type?: 'text' | 'code' | 'diff' | 'plan';
  metadata?: {
    language?: string;
    changes?: Array<{ path: string; type: 'added' | 'modified' | 'deleted' }>;
    plan?: Array<{ step: number; description: string; status: 'pending' | 'in_progress' | 'completed' }>;
  };
}

interface AgentChatProps {
  onExecuteAgent?: (message: string) => void;
}

export const AgentChat: React.FC<AgentChatProps> = ({ onExecuteAgent }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'agent', 
      content: 'Hello! I\'m your AI coding assistant. I can help you write, review, and refactor code. What would you like to work on today?',
      timestamp: new Date().toLocaleTimeString(),
      type: 'text'
    }
  ]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    try {
      wsRef.current = new WebSocket('ws://localhost:8000/api/v1/websocket/ws/default_session');
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
      };
      
      wsRef.current.onclose = () => {
        setIsConnected(false);
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.event === 'workflow_started') {
            setMessages(prev => [...prev, {
              id: String(Date.now()),
              role: 'agent',
              content: '🚀 Starting workflow execution...',
              timestamp: new Date().toLocaleTimeString(),
              type: 'text'
            }]);
          } else if (data.event === 'node_update') {
            setMessages(prev => [...prev, {
              id: String(Date.now()),
              role: 'agent',
              content: `⚡ ${data.node}: ${data.state.status}`,
              timestamp: new Date().toLocaleTimeString(),
              type: 'text'
            }]);
          } else if (data.event === 'message_update') {
            setMessages(prev => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage?.isStreaming) {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMessage, content: lastMessage.content + data.content }
                ];
              }
              return [...prev, {
                id: String(Date.now()),
                role: 'agent',
                content: data.content,
                timestamp: new Date().toLocaleTimeString(),
                isStreaming: true,
                type: 'text'
              }];
            });
          } else if (data.event === 'workflow_completed') {
            setMessages(prev => [...prev, {
              id: String(Date.now()),
              role: 'agent',
              content: '✅ Workflow completed successfully!',
              timestamp: new Date().toLocaleTimeString(),
              type: 'text'
            }]);
          } else if (data.event === 'error') {
            setMessages(prev => [...prev, {
              id: String(Date.now()),
              role: 'agent',
              content: `❌ Error: ${data.message}`,
              timestamp: new Date().toLocaleTimeString(),
              type: 'text'
            }]);
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      return () => {
        wsRef.current?.close();
      };
    } catch (e) {
      console.error('Failed to connect to WebSocket:', e);
    }
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: String(Date.now()),
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString(),
      type: 'text'
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        message: input,
        project_id: ''
      }));
    }
    
    if (onExecuteAgent) {
      onExecuteAgent(input);
    }
    
    setInput('');
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const togglePlan = (messageId: string) => {
    setExpandedPlans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const renderDiff = (changes: Array<{ path: string; type: 'added' | 'modified' | 'deleted' }>) => {
    return (
      <div className="mt-2 rounded-lg overflow-hidden bg-background border border-border">
        <div className="flex items-center justify-between px-3 py-1.5 bg-background-elevated border-b border-border">
          <span className="text-xs text-text-muted font-medium">Proposed Changes</span>
          <div className="flex gap-1">
            <button className="p-1 hover:bg-background-hover rounded transition-colors text-success hover:text-success" title="Apply All">
              <CheckCircle size={14} />
            </button>
            <button className="p-1 hover:bg-background-hover rounded transition-colors text-error hover:text-error" title="Reject All">
              <XCircle size={14} />
            </button>
          </div>
        </div>
        <div className="p-2 space-y-1">
          {changes.map((change, idx) => (
            <div key={idx} className="flex items-center gap-2 px-2 py-1.5 rounded bg-background-elevated">
              {change.type === 'added' && <CheckCircle size={12} className="text-success" />}
              {change.type === 'modified' && <FileDiff size={12} className="text-warning" />}
              {change.type === 'deleted' && <XCircle size={12} className="text-error" />}
              <span className="text-xs text-text-primary font-mono truncate">{change.path}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPlan = (plan: Array<{ step: number; description: string; status: 'pending' | 'in_progress' | 'completed' }>, messageId: string) => {
    const isExpanded = expandedPlans.has(messageId);
    
    return (
      <div className="mt-2 rounded-lg overflow-hidden bg-background border border-border">
        <div 
          className="flex items-center justify-between px-3 py-1.5 bg-background-elevated border-b border-border cursor-pointer hover:bg-background-hover transition-colors"
          onClick={() => togglePlan(messageId)}
        >
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-primary" />
            <span className="text-xs text-text-muted font-medium">Execution Plan</span>
            <span className="text-xs text-text-secondary">({plan.length} steps)</span>
          </div>
          {isExpanded ? <ChevronDown size={12} className="text-text-muted" /> : <ChevronRight size={12} className="text-text-muted" />}
        </div>
        {isExpanded && (
          <div className="p-2 space-y-1 animate-fade-in">
            {plan.map((step) => (
              <div key={step.step} className="flex items-center gap-2 px-2 py-1.5 rounded bg-background-elevated">
                {step.status === 'completed' && <CheckCircle size={12} className="text-success" />}
                {step.status === 'in_progress' && <Play size={12} className="text-primary animate-pulse" />}
                {step.status === 'pending' && <Clock size={12} className="text-text-muted" />}
                <span className="text-xs text-text-primary">{step.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background-panel border-l border-border">
      {/* Header */}
      <div className="p-3 border-b border-border bg-background-elevated">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bot size={18} className="text-primary" />
              <Sparkles size={10} className="absolute -top-1 -right-1 text-warning" />
            </div>
            <div>
              <span className="text-sm font-semibold text-text-primary">AI Assistant</span>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-error'}`} />
                <span className="text-xs text-text-muted">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 hover:bg-background rounded-md transition-colors text-text-muted hover:text-text-primary" title="Clear Chat">
              <RotateCcw size={16} />
            </button>
            <button className="p-1.5 hover:bg-background rounded-md transition-colors text-text-muted hover:text-text-primary">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-primary to-primary-active text-white' 
                : 'bg-background-elevated border border-border text-primary'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>

            {/* Message Content */}
            <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
              <div className={`px-4 py-3 rounded-lg text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-primary to-primary-active text-white shadow-glow'
                  : 'bg-background-elevated border border-border text-text-primary'
              }`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {msg.metadata?.plan && renderPlan(msg.metadata.plan, msg.id)}
                {msg.metadata?.changes && renderDiff(msg.metadata.changes)}
              </div>
              
              {/* Message Actions */}
              <div className="flex items-center gap-2 mt-1 px-1">
                <span className="text-xs text-text-muted">{msg.timestamp}</span>
                {msg.role === 'agent' && (
                  <button
                    onClick={() => handleCopy(msg.content, msg.id)}
                    className="p-1 hover:bg-background rounded transition-colors text-text-muted hover:text-text-primary"
                    title="Copy"
                  >
                    {copiedMessageId === msg.id ? (
                      <Check size={12} className="text-success" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-background-elevated">
        <div className="flex items-end gap-2 bg-background border border-border rounded-lg p-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask the AI to help with your code... (Shift+Enter for new line)"
            className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder-text-muted text-sm resize-none min-h-[40px] max-h-[120px] py-2"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !isConnected}
            className="p-2 bg-primary hover:bg-primary-hover disabled:bg-background-border disabled:cursor-not-allowed text-white rounded-md transition-all duration-200 shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-xs text-text-muted">
            Press <kbd className="px-1.5 py-0.5 bg-background-elevated border border-border rounded text-text-secondary">Enter</kbd> to send
          </span>
          <span className="text-xs text-text-muted">
            Powered by Gemini
          </span>
        </div>
      </div>
    </div>
  );
};
