import React, { useEffect, useState } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { Check, X, FileDiff, GitCompare } from 'lucide-react';
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

  useEffect(() => {
    if (selected >= changes.length) setSelected(Math.max(0, changes.length - 1));
  }, [changes.length, selected]);

  const active = changes[selected];

  return (
    <Modal
      open={open && changes.length > 0}
      onClose={onClose}
      title={`AI-proposed changes (${changes.length})`}
      icon={<GitCompare size={16} className="text-warning" />}
      widthClass="max-w-5xl"
    >
      <div className="flex gap-3 h-[70vh]">
        {/* File list */}
        <div className="w-56 shrink-0 border-r border-border pr-2 overflow-y-auto">
          {changes.map((c, i) => (
            <div
              key={c.file_path}
              onClick={() => setSelected(i)}
              className={`flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer text-sm transition-colors ${
                i === selected ? 'bg-primary/15 text-text-primary' : 'hover:bg-background-hover text-text-secondary'
              }`}
            >
              <FileDiff size={14} className="text-warning shrink-0" />
              <span className="truncate font-mono text-xs">{c.file_path}</span>
            </div>
          ))}
        </div>

        {/* Diff */}
        <div className="flex-1 min-w-0 flex flex-col">
          {active ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-text-secondary truncate">{active.file_path}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onReject(active)}
                    className="btn-secondary flex items-center gap-1.5 !py-1 !px-2.5 text-xs"
                  >
                    <X size={13} className="text-error" /> Reject
                  </button>
                  <button
                    onClick={() => onApply(active)}
                    className="btn-primary flex items-center gap-1.5 !py-1 !px-2.5 text-xs"
                  >
                    <Check size={13} /> Apply
                  </button>
                </div>
              </div>
              <div className="flex-1 border border-border rounded-md overflow-hidden">
                <DiffEditor
                  height="100%"
                  language={languageFromName(active.file_path)}
                  original={originalFor(active.file_path)}
                  modified={active.content}
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  options={{
                    readOnly: true,
                    renderSideBySide: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-text-muted text-sm">
              No pending changes.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
