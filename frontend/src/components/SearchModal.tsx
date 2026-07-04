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
}

export const SearchModal: React.FC<Props> = ({ open, projectId, onClose, onOpenFile }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else {
      setQuery('');
      setResults([]);
      setSearched(false);
    }
  }, [open]);

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.search(projectId, query.trim(), 15);
      setResults(data);
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
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          placeholder="Describe the code you're looking for…"
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

      <div className="mt-3 max-h-[55vh] overflow-y-auto space-y-1.5">
        {results.map((r, i) => {
          const path = String(r.payload.file_path ?? 'unknown');
          const content = String(r.payload.content ?? '');
          const name = String(r.payload.name ?? '');
          return (
            <button
              key={i}
              onClick={() => openResult(path)}
              className="w-full text-left p-3 rounded-md border border-border hover:border-primary/50 hover:bg-background-hover transition-colors"
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

        {searched && !loading && results.length === 0 && (
          <p className="text-sm text-text-muted text-center py-8">No matches found.</p>
        )}
        {!searched && (
          <p className="text-xs text-text-muted text-center py-8">
            Search runs over the indexed repository using Gemini embeddings.
          </p>
        )}
      </div>
    </Modal>
  );
};
