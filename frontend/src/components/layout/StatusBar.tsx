import React from 'react';
import { GitBranch, GitCommit, CheckCircle2, Loader2 } from 'lucide-react';

interface StatusBarProps {
  branch: string;
  changes: number;
  running: boolean;
  activeFile?: string;
  language?: string;
  project?: any;
  cursorPosition?: { line: number; col: number };
}

export const StatusBar: React.FC<StatusBarProps> = ({
  branch,
  changes,
  running,
  activeFile,
  language,
  project,
  cursorPosition,
}) => {
  const metadata = project?.metadata_ || {};
  const isCloning = project?.index_status === 'cloning' || project?.index_status === 'pending';
  const isIndexing = project?.index_status === 'indexing';
  const isIndexed = project?.index_status === 'indexed';
  
  const indexedFiles = metadata.indexed_files || 0;
  const totalFiles = metadata.total_files || 0;
  const cloneTime = metadata.clone_time_ms ? (metadata.clone_time_ms / 1000).toFixed(1) : null;
  const indexTime = metadata.index_time_ms ? (metadata.index_time_ms / 1000).toFixed(1) : null;
  const embedRate = metadata.embedding_rate ? metadata.embedding_rate.toFixed(1) : null;
  return (
    <div className="h-6 bg-background border-t border-border flex items-center justify-between px-2 text-[11px] font-medium text-text-muted select-none z-50">
      <div className="flex items-center gap-0.5 h-full">
        <div className="flex items-center gap-1.5 px-2 h-full hover:bg-bg-hover hover:text-text-primary cursor-pointer rounded-sm transition-colors">
          <GitBranch size={12} className="text-text-primary" />
          <span>{branch}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 h-full hover:bg-bg-hover hover:text-text-primary cursor-pointer rounded-sm transition-colors">
          <GitCommit size={12} />
          <span>{changes} change{changes !== 1 ? 's' : ''}</span>
        </div>
        {running && (
          <div className="flex items-center gap-1.5 px-2 h-full text-primary hover:bg-bg-hover cursor-pointer rounded-sm transition-colors">
            <Loader2 size={12} className="animate-spin" />
            <span>Agent thinking...</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-0.5 h-full">
        {cursorPosition && (
          <div className="flex items-center gap-1.5 px-2 h-full hover:bg-bg-hover hover:text-text-primary cursor-pointer rounded-sm transition-colors">
            <span>Ln {cursorPosition.line}, Col {cursorPosition.col}</span>
          </div>
        )}
        {activeFile && (
          <div className="flex items-center gap-1.5 px-2 h-full hover:bg-bg-hover hover:text-text-primary cursor-pointer rounded-sm transition-colors">
            <span className="font-mono">{activeFile}</span>
          </div>
        )}
        {language && (
          <div className="flex items-center gap-1.5 px-2 h-full hover:bg-bg-hover hover:text-text-primary cursor-pointer rounded-sm transition-colors">
            <span className="uppercase">{language}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 px-2 h-full hover:bg-bg-hover hover:text-text-primary cursor-pointer rounded-sm transition-colors" title="Workspace Status">
          {isCloning ? (
            <>
              <Loader2 size={12} className="animate-spin text-primary" />
              <span>Cloning...</span>
            </>
          ) : isIndexing ? (
            <>
              <Loader2 size={12} className="animate-spin text-primary" />
              <span>Indexing ({indexedFiles}/{totalFiles})</span>
            </>
          ) : isIndexed ? (
            <>
              <CheckCircle2 size={12} className="text-success" />
              <span title={`Cloned in ${cloneTime}s | Indexed in ${indexTime}s | ${embedRate} chunks/sec`}>Arceus Ready</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={12} className="text-success" />
              <span>Arceus Ready</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
