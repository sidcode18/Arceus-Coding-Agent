import React, { useEffect, useState } from 'react';
import { Server, Radio, Sparkles } from 'lucide-react';
import { API_BASE } from '../../api/client';
import type { SocketStatus } from '../../hooks/useAgentSocket';
import axios from 'axios';

interface Props {
  wsStatus: SocketStatus;
}

type Health = 'up' | 'down' | 'checking';

const dot = (h: Health | SocketStatus) => {
  if (h === 'up' || h === 'connected') return 'bg-success';
  if (h === 'checking' || h === 'connecting') return 'bg-warning animate-pulse';
  return 'bg-error';
};

export const ConnectionIndicators: React.FC<Props> = ({ wsStatus }) => {
  const [backend, setBackend] = useState<Health>('checking');
  const [agents, setAgents] = useState<Health>('checking');

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        await axios.get(`${API_BASE}/health`, { timeout: 4000 });
        if (active) setBackend('up');
      } catch {
        if (active) setBackend('down');
      }
      try {
        await axios.get(`${API_BASE}/api/v1/agents/health`, { timeout: 4000 });
        if (active) setAgents('up');
      } catch {
        if (active) setAgents('down');
      }
    };
    check();
    const id = setInterval(check, 10000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const Item = ({
    icon,
    label,
    state,
    title,
  }: {
    icon: React.ReactNode;
    label: string;
    state: Health | SocketStatus;
    title: string;
  }) => (
    <div className="flex items-center gap-1.5" title={title}>
      {icon}
      <span className="hidden lg:inline text-xs text-text-muted">{label}</span>
      <span className={`w-1.5 h-1.5 rounded-full ${dot(state)}`} />
    </div>
  );

  return (
    <div className="flex items-center gap-3">
      <Item
        icon={<Server size={14} className="text-text-muted" />}
        label="Backend"
        state={backend}
        title={`Backend API: ${backend}`}
      />
      <Item
        icon={<Radio size={14} className="text-text-muted" />}
        label="WebSocket"
        state={wsStatus}
        title={`Agent WebSocket: ${wsStatus}`}
      />
      <Item
        icon={<Sparkles size={14} className="text-text-muted" />}
        label="Gemini"
        state={agents}
        title="Gemini/agent subsystem (key configured server-side)"
      />
    </div>
  );
};
