import React from 'react';
import { AlertCircle, FileWarning, PanelLeft } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';

interface ProblemsPanelProps {
  onClose: () => void;
}

export const ProblemsPanel: React.FC<ProblemsPanelProps> = ({ onClose }) => {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="panel-header">
        <span className="flex items-center gap-1.5"><AlertCircle size={13} /> Problems</span>
        <button onClick={onClose} className="icon-btn" title="Close Panel">
          <PanelLeft size={13} className="rotate-90" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 min-h-0">
        <EmptyState 
          icon={<FileWarning size={32} className="text-border" strokeWidth={1.5} />} 
          title="No problems detected" 
          description="Your workspace is currently free of linting errors and warnings."
        />
      </div>
    </div>
  );
};
