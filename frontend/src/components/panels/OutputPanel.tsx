import React from 'react';
import { AlignLeft, PanelLeft } from 'lucide-react';

interface OutputPanelProps {
  onClose: () => void;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({ onClose }) => {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="panel-header">
        <span className="flex items-center gap-1.5"><AlignLeft size={13} /> Output</span>
        <div className="flex items-center gap-2">
          <select className="bg-transparent border-none text-xs text-text-primary focus:outline-none cursor-pointer">
            <option>Extension Host</option>
            <option>Agent Logs</option>
            <option>Tasks</option>
          </select>
          <button onClick={onClose} className="icon-btn" title="Close Panel">
            <PanelLeft size={13} className="rotate-90" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 min-h-0 font-mono text-xs text-text-secondary whitespace-pre-wrap">
        [Info] Output panel initialized.
      </div>
    </div>
  );
};
