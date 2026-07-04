import React, { useCallback, useEffect, useState } from 'react';
import {
  Folder,
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  GitBranch,
  FileCode,
  FileText,
  FileJson,
  Globe,
  AlertCircle,
} from 'lucide-react';
import { api, extractError } from '../../api/client';
import type { TreeNode } from '../../api/types';
import { languageFromName } from '../../lib/language';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';

interface FileTreeProps {
  projectId: string;
  branch: string;
  reloadToken: number;
  activePath?: string;
  changedPaths: Set<string>;
  onFileSelect: (path: string, name: string) => void;
}

const fileIcon = (name: string) => {
  const lang = languageFromName(name);
  const map: Record<string, React.ElementType> = {
    typescript: FileCode,
    javascript: FileCode,
    python: FileCode,
    html: Globe,
    css: FileCode,
    json: FileJson,
    markdown: FileText,
    txt: FileText,
  };
  const Icon = map[lang] || File;
  return <Icon size={14} />;
};

const fileColor = (name: string) => {
  const lang = languageFromName(name);
  const map: Record<string, string> = {
    typescript: 'text-primary',
    javascript: 'text-warning',
    python: 'text-success',
    html: 'text-error',
    css: 'text-info',
    json: 'text-warning',
    markdown: 'text-text-secondary',
  };
  return map[lang] || 'text-text-muted';
};

const TreeItem: React.FC<{
  node: TreeNode;
  path: string;
  level: number;
  activePath?: string;
  changedPaths: Set<string>;
  onFileSelect: (path: string, name: string) => void;
}> = ({ node, path, level, activePath, changedPaths, onFileSelect }) => {
  const [expanded, setExpanded] = useState(level < 1);

  if (node.type === 'directory') {
    const children = [...(node.children || [])].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return (
      <div>
        <div
          className="flex items-center gap-1.5 px-2 py-1 hover:bg-background-hover cursor-pointer rounded-md transition-colors"
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <ChevronDown size={12} className="text-text-muted shrink-0" />
          ) : (
            <ChevronRight size={12} className="text-text-muted shrink-0" />
          )}
          {expanded ? (
            <FolderOpen size={15} className="text-primary shrink-0" />
          ) : (
            <Folder size={15} className="text-text-secondary shrink-0" />
          )}
          <span className="text-sm text-text-primary truncate">{node.name}</span>
        </div>
        {expanded && (
          <div className="animate-fade-in">
            {children.map((child) => (
              <TreeItem
                key={`${path}/${child.name}`}
                node={child}
                path={path ? `${path}/${child.name}` : child.name}
                level={level + 1}
                activePath={activePath}
                changedPaths={changedPaths}
                onFileSelect={onFileSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = activePath === path;
  const isChanged = changedPaths.has(path);
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer rounded-md transition-colors ${
        isActive ? 'bg-primary/15 text-text-primary' : 'hover:bg-background-hover'
      }`}
      style={{ paddingLeft: `${level * 12 + 22}px` }}
      onClick={() => onFileSelect(path, node.name)}
    >
      <span className={fileColor(node.name)}>{fileIcon(node.name)}</span>
      <span className="text-sm text-text-primary truncate flex-1">{node.name}</span>
      {isChanged && <span className="w-1.5 h-1.5 rounded-full bg-git-modified shrink-0" />}
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({
  projectId,
  branch,
  reloadToken,
  activePath,
  changedPaths,
  onFileSelect,
}) => {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getTree(projectId);
      setTree(data);
      setError(null);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const rootChildren = tree?.children
    ? [...tree.children].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
    : [];

  return (
    <div className="flex flex-col h-full bg-background-sidebar">
      <div className="flex items-center justify-between px-3 h-9 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <GitBranch size={14} className="text-primary shrink-0" />
          <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">
            Explorer
          </span>
          <span className="text-xs text-text-muted bg-background-elevated px-1.5 py-0.5 rounded truncate">
            {branch}
          </span>
        </div>
        <button
          onClick={load}
          className="p-1 hover:bg-background-hover rounded transition-colors text-text-muted hover:text-text-primary"
          title="Refresh tree"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <EmptyState
            icon={<AlertCircle size={24} className="text-error" />}
            title="Tree unavailable"
            description={error}
          />
        ) : rootChildren.length === 0 ? (
          <EmptyState icon={<Folder size={24} />} title="Empty repository" />
        ) : (
          rootChildren.map((child) => (
            <TreeItem
              key={child.name}
              node={child}
              path={child.name}
              level={0}
              activePath={activePath}
              changedPaths={changedPaths}
              onFileSelect={onFileSelect}
            />
          ))
        )}
      </div>
    </div>
  );
};
