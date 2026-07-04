import React from 'react';
import { 
  Bot, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  agent: 'retriever' | 'planner' | 'coder' | 'reviewer' | 'reflection';
  status: 'pending' | 'running' | 'completed' | 'error';
  title: string;
  description?: string;
  timestamp: string;
}

interface AgentTimelineProps {
  events: TimelineEvent[];
}

const agentColors = {
  retriever: 'bg-purple-500',
  planner: 'bg-blue-500',
  coder: 'bg-green-500',
  reviewer: 'bg-orange-500',
  reflection: 'bg-pink-500',
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

export const AgentTimeline: React.FC<AgentTimelineProps> = ({ events }) => {
  return (
    <div className="flex flex-col h-full bg-background-panel">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-primary" />
          <span className="text-sm font-semibold text-text-primary">Agent Execution</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-3">
          {events.map((event, index) => {
            const StatusIcon = statusIcons[event.status];
            
            return (
              <div key={event.id} className="relative">
                {/* Timeline Line */}
                {index < events.length - 1 && (
                  <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-border" />
                )}
                
                {/* Event Card */}
                <div className="flex gap-3">
                  {/* Status Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    event.status === 'completed' ? 'bg-success/20' :
                    event.status === 'error' ? 'bg-error/20' :
                    event.status === 'running' ? 'bg-primary/20' :
                    'bg-background-elevated'
                  }`}>
                    <StatusIcon size={16} className={statusColors[event.status]} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-text-primary">{event.title}</span>
                      <span className={`badge ${agentColors[event.agent]} text-white`}>
                        {event.agent}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-xs text-text-secondary mb-2">{event.description}</p>
                    )}
                    <span className="text-xs text-text-muted">{event.timestamp}</span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {events.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
              <Bot size={32} className="mb-2 opacity-50" />
              <p className="text-sm">No agent execution yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
