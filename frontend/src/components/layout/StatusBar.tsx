import React from 'react';
import { GitBranch, GitCommit, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export const StatusBar: React.FC = () => {
  return (
    <div className="h-6 bg-background-sidebar border-t border-border flex items-center justify-between px-4 text-xs text-text-secondary select-none">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 hover:text-text-primary cursor-pointer transition-colors">
          <GitBranch size={12} />
          <span>main</span>
        </div>
        <div className="flex items-center gap-1.5 hover:text-text-primary cursor-pointer transition-colors">
          <GitCommit size={12} />
          <span>3 changes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertCircle size={12} className="text-warning" />
          <span>2 warnings</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Clock size={12} />
          <span>Ln 42, Col 18</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-success" />
          <span>Prettier</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Python 3.11</span>
        </div>
      </div>
    </div>
  );
};
