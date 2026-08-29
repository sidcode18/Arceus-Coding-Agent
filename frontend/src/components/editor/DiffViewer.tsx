import React, { useEffect, useState } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { Check, X, FileDiff, GitCompare, Columns, ListTree } from 'lucide-react';
import type { CodeChange } from '../../api/types';
import { languageFromName } from '../../lib/language';
import { Modal } from '../ui/Modal';

interface DiffViewerProps {
  open: boolean;
  changes: CodeChange[];
  originalFor: (path: string) => string;
  theme: 'dark' | 'light';
  onApply: (change: CodeChange) => void;
  onReject: (change: CodeChange) => void;
  onClose: () => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  open,
  changes,
  originalFor,
  theme,
  onApply,
  onReject,
  onClose,
}) => {
  const [selected, setSelected] = useState(0);
  const [sideBySide, setSideBySide] = useState(true);

  useEffect(() => {
    if (selected >= changes.length) setSelected(Math.max(0, changes.length - 1));
  }, [changes.length, selected]);

  const active = changes[selected];

  return (
    <Modal
      open={open && changes.length > 0}
      onClose={onClose}
      title="Review AI Changes"
      icon={<GitCompare size={16} className="text-primary" />}
      widthClass="max-w-6xl"
      className="sm:h-[80vh]"
    >
      <div className="flex h-[calc(80vh-80px)] -mx-6 -mb-6 border-t border-border">
        {/* File list Sidebar */}
        <div className="w-64 shrink-0 bg-background-sidebar border-r border-border flex flex-col">
          <div className="px-3 py-2 border-b border-border text-xs font-semibold uppercase tracking-wider text-text-muted">
            Changed Files ({changes.length})
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {changes.map((c, i) => (
              <div
                key={c.file_path}
                onClick={() => setSelected(i)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-[13px] transition-colors ${
                  i === selected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-background-hover text-text-secondary hover:text-text-primary'
                }`}
              >
                <FileDiff size={14} className={i === selected ? "text-primary" : "text-text-muted"} />
                <span className="truncate">{c.file_path.split('/').pop()}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0 ml-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Diff Area */}
        <div className="flex-1 min-w-0 flex flex-col bg-background-editor">
          {active ? (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background-elevated">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] font-mono text-text-secondary truncate bg-background px-2 py-0.5 rounded border border-border">
                    {active.file_path}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center border border-border rounded bg-background overflow-hidden mr-2">
                    <button
                      onClick={() => setSideBySide(false)}
                      className={`p-1.5 transition-colors ${!sideBySide ? 'bg-background-hover text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
                      title="Inline View"
                    >
                      <ListTree size={14} />
                    </button>
                    <div className="w-px h-4 bg-border" />
                    <button
                      onClick={() => setSideBySide(true)}
                      className={`p-1.5 transition-colors ${sideBySide ? 'bg-background-hover text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
                      title="Split View"
                    >
                      <Columns size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => onReject(active)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[13px] font-medium border border-border hover:bg-error/10 hover:text-error hover:border-error/30 transition-colors"
                  >
                    <X size={14} /> Reject
                  </button>
                  <button
                    onClick={() => onApply(active)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[13px] font-medium bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
                  >
                    <Check size={14} /> Accept
                  </button>
                </div>
              </div>
              
              {/* Editor */}
              <div className="flex-1 relative">
                <DiffEditor
                  height="100%"
                  language={languageFromName(active.file_path)}
                  original={originalFor(active.file_path)}
                  modified={active.content}
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  options={{
                    readOnly: true,
                    renderSideBySide: sideBySide,
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    diffWordWrap: 'off',
                    padding: { top: 16, bottom: 16 },
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-text-muted text-[13px]">
              No pending changes.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
