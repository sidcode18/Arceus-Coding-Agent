import React, { useEffect, useRef, useState } from 'react';
import { Search, Loader2, FileCode, CornerDownLeft } from 'lucide-react';
import { Modal } from './ui/Modal';
import { api, extractError } from '../api/client';
import type { SearchResult } from '../api/types';
import { toast } from '../lib/toast';

interface Props {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onOpenFile: (path: string) => void;
  onCommand?: (cmd: string) => void;
}

const COMMANDS = [
  { id: 'zen', title: 'Toggle Zen Mode', icon: '⌘⇧Z' },
  { id: 'settings', title: 'Open Settings', icon: '' },
  { id: 'sidebar', title: 'Toggle Sidebar', icon: '⌘B' },
  { id: 'terminal', title: 'Toggle Terminal', icon: '⌘`' },
  { id: 'diff', title: 'Review Changes', icon: '' }
];

export const SearchModal: React.FC<Props> = ({ open, projectId, onClose, onOpenFile, onCommand }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else {
      setQuery('');
      setResults([]);
      setSearched(false);
      setSelectedIndex(0);
    }
  }, [open]);

  const filteredCommands = query.startsWith('>') 
    ? COMMANDS.filter(c => c.title.toLowerCase().includes(query.slice(1).trim().toLowerCase()))
    : COMMANDS.filter(c => c.title.toLowerCase().includes(query.toLowerCase()));

  const runSearch = async () => {
    const term = query.startsWith('>') ? query.slice(1).trim() : query.trim();
    if (!term) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.search(projectId, term, 15);
      setResults(data);
      setSelectedIndex(0);
    } catch (err) {
      toast.error('Search failed', extractError(err));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const openResult = (path: string) => {
    onOpenFile(path);
    onClose();
  };

  const executeCommand = (id: string) => {
    if (onCommand) onCommand(id);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isCommandMode = query.startsWith('>') || (!searched && filteredCommands.length > 0);
    const totalItems = isCommandMode ? filteredCommands.length : results.length;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (totalItems || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalItems) % (totalItems || 1));
    } else if (e.key === 'Enter') {
      if (isCommandMode && filteredCommands.length > 0) {
        executeCommand(filteredCommands[selectedIndex].id);
      } else if (searched && results.length > 0) {
        openResult(String(results[selectedIndex].payload.file_path));
      } else {
        runSearch();
      }
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Semantic search"
      icon={<Search size={16} className="text-primary" />}
      widthClass="max-w-2xl"
    >
      <div className="flex items-center gap-2 bg-background border border-border rounded-md px-3 py-2 focus-within:border-primary transition-colors">
        <Search size={15} className="text-text-muted" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type '>' for commands, or search code…"
          className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder-text-muted"
        />
        {loading ? (
          <Loader2 size={15} className="animate-spin text-text-muted" />
        ) : (
          <kbd className="px-1.5 py-0.5 bg-background-elevated border border-border rounded text-xs text-text-muted flex items-center gap-1">
            <CornerDownLeft size={10} /> search
          </kbd>
        )}
      </div>

      <div className="mt-3 max-h-[55vh] overflow-y-auto space-y-1.5 scrollbar-thin">
        {/* Commands Section */}
        {(!searched || query.startsWith('>')) && filteredCommands.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-1">Commands</div>
            <div className="space-y-1">
              {filteredCommands.map((cmd, i) => (
                <button
                  key={cmd.id}
                  onClick={() => executeCommand(cmd.id)}
                  className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between text-sm transition-colors ${i === selectedIndex ? 'bg-primary text-white' : 'hover:bg-bg-hover text-text-primary'}`}
                >
                  <span>{cmd.title}</span>
                  {cmd.icon && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${i === selectedIndex ? 'border-white/30 bg-white/10' : 'border-border bg-background-elevated text-text-muted'}`}>{cmd.icon}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results Section */}
        {searched && !query.startsWith('>') && results.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-1">Files</div>
            <div className="space-y-1.5">
              {results.map((r, i) => {
                const path = String(r.payload.file_path ?? 'unknown');
                const content = String(r.payload.content ?? '');
                const name = String(r.payload.name ?? '');
                return (
                  <button
                    key={i}
                    onClick={() => openResult(path)}
                    className={`w-full text-left p-3 rounded-md border transition-colors ${i === selectedIndex ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-bg-hover'}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileCode size={13} className="text-primary shrink-0" />
                        <span className="text-xs font-mono text-text-primary truncate">{path}</span>
                        {name && <span className="text-xs text-text-muted truncate">· {name}</span>}
                      </div>
                      <span className="text-xs text-text-muted shrink-0">{r.score.toFixed(3)}</span>
                    </div>
                    <pre className="text-xs text-text-secondary font-mono line-clamp-3 whitespace-pre-wrap break-words">
                      {content.slice(0, 240)}
                    </pre>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {searched && !loading && results.length === 0 && !query.startsWith('>') && (
          <p className="text-sm text-text-muted text-center py-8">No matches found.</p>
        )}
        {!searched && query === '' && (
          <p className="text-xs text-text-muted text-center py-8">
            Start typing to search commands, or hit Enter to semantic search code.
          </p>
        )}
      </div>
    </Modal>
  );
};
