import React from 'react';
import { GitBranch, GitCommit, CheckCircle2, Loader2, FileCode } from 'lucide-react';

interface StatusBarProps {
  branch: string;
  changes: number;
  running: boolean;
  activeFile?: string;
  language?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  branch,
  changes,
  running,
  activeFile,
  language,
}) => {
  return (
    <div className="h-6 bg-background-sidebar border-t border-border flex items-center justify-between px-4 text-xs text-text-secondary select-none">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <GitBranch size={12} />
          <span>{branch}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <GitCommit size={12} />
          <span>{changes} pending change{changes === 1 ? '' : 's'}</span>
        </div>
        {running && (
          <div className="flex items-center gap-1.5 text-primary">
            <Loader2 size={12} className="animate-spin" />
            <span>Agent running</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {activeFile && (
          <div className="flex items-center gap-1.5">
            <FileCode size={12} />
            <span className="font-mono">{activeFile}</span>
          </div>
        )}
        {language && <span className="capitalize">{language}</span>}
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-success" />
          <span>Arceus</span>
        </div>
      </div>
    </div>
  );
};
