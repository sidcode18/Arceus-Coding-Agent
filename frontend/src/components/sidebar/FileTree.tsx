import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  FolderOpen,
  File,
  ChevronRight,
  RefreshCw,
  GitBranch,
  FileCode,
  FileText,
  FileJson,
  Globe,
  Image as ImageIcon,
  Layout,
  Database,
  AlertCircle
} from 'lucide-react';
import { api, extractError } from '../../api/client';
import type { TreeNode } from '../../api/types';
import { languageFromName } from '../../lib/language';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';

interface FileTreeProps {
  projectId: string;
  projectName?: string;
  branch: string;
  reloadToken: number;
  activePath?: string;
  changedPaths: Set<string>;
  onFileSelect: (path: string, name: string) => void;
  onCollapse?: () => void;
}

// ... keeping imports and fileIcon/fileColor the same ...

const fileIcon = (name: string) => {
  const lang = languageFromName(name);
  const ext = name.split('.').pop()?.toLowerCase();
  
  if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext || '')) return <ImageIcon size={13} />;
  if (['tsx', 'jsx'].includes(ext || '')) return <Layout size={13} />;
  if (['sql', 'db'].includes(ext || '')) return <Database size={13} />;
  
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
  return <Icon size={13} />;
};

const fileColor = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  
  if (['ts', 'tsx'].includes(ext || '')) return 'text-blue-400';
  if (['js', 'jsx'].includes(ext || '')) return 'text-yellow-400';
  if (['json'].includes(ext || '')) return 'text-green-400';
  if (['py'].includes(ext || '')) return 'text-blue-500';
  if (['md'].includes(ext || '')) return 'text-purple-400';
  if (['html', 'css'].includes(ext || '')) return 'text-orange-400';
  
  return 'text-text-muted';
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
          className="flex items-center gap-1 px-1 py-[3px] hover:bg-bg-hover cursor-pointer rounded transition-colors group select-none"
          style={{ paddingLeft: `${level * 10 + 4}px` }}
          onClick={() => setExpanded((v) => !v)}
        >
          <motion.div
            initial={false}
            animate={{ rotate: expanded ? 90 : 0 }}
            className="text-text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity w-3.5 flex justify-center"
          >
            <ChevronRight size={12} strokeWidth={2.5} />
          </motion.div>
          {expanded ? (
            <FolderOpen size={13} className="text-text-secondary shrink-0" />
          ) : (
            <Folder size={13} className="text-text-secondary shrink-0 group-hover:text-text-primary transition-colors" />
          )}
          <span className="text-[12px] font-medium text-text-primary truncate ml-0.5">{node.name}</span>
        </div>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="overflow-hidden"
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const isActive = activePath === path;
  const isChanged = changedPaths.has(path);
  return (
    <div
      className={`flex items-center gap-1.5 px-1 py-[3px] cursor-pointer rounded transition-colors group select-none ${
        isActive ? 'bg-primary/10' : 'hover:bg-bg-hover'
      }`}
      style={{ paddingLeft: `${level * 10 + 20}px` }}
      onClick={() => onFileSelect(path, node.name)}
    >
      <span className={`${fileColor(node.name)} ${isActive ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'} transition-opacity flex-shrink-0`}>
        {fileIcon(node.name)}
      </span>
      <span className={`text-[12px] truncate flex-1 ${isActive ? 'text-primary font-medium' : isChanged ? 'text-warning font-medium' : 'text-text-secondary group-hover:text-text-primary'}`}>
        {node.name}
      </span>
      {isChanged && <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0 shadow-[0_0_4px_rgba(234,179,8,0.5)]" />}
    </div>
  );
};

import { PanelLeft } from 'lucide-react';

export const FileTree: React.FC<FileTreeProps> = ({
  projectId,
  projectName,
  branch,
  reloadToken,
  activePath,
  changedPaths,
  onFileSelect,
  onCollapse,
}) => {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalReloadToken, setInternalReloadToken] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getTree(projectId);
      if (data && (data as any).status === 'cloning') {
        setError('cloning');
        setTimeout(() => {
          setInternalReloadToken(prev => prev + 1);
        }, 2000);
        return;
      }
      setTree(data);
      setError(null);
    } catch (err) {
      const errMsg = extractError(err);
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load, reloadToken, internalReloadToken]);

  const rootChildren = tree?.children
    ? [...tree.children].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
    : [];

  return (
    <div className="flex flex-col h-full bg-background-sidebar overflow-hidden">
      <div className="panel-header border-b border-border shrink-0 bg-background-elevated">
        <span className="truncate">{projectName || 'Explorer'}</span>
        <button onClick={onCollapse} className="icon-btn" title="Collapse">
          <PanelLeft size={14} />
        </button>
      </div>
      
      <div className="flex items-center justify-between px-3 py-2 shrink-0 border-b border-border/50 bg-background-sidebar">
        <div className="flex items-center gap-2 min-w-0">
          <GitBranch size={12} className="text-text-muted shrink-0" />
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider truncate">
            {branch}
          </span>
        </div>
        <button
          onClick={load}
          className="p-1 hover:bg-bg-hover rounded transition-colors text-text-muted hover:text-text-primary"
          title="Refresh tree"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 px-1 pb-4">
        {loading && error !== 'cloning' ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : error === 'cloning' ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
            <LoadingSpinner />
            <p className="mt-3 text-xs font-semibold text-text-primary">Cloning repository...</p>
            <p className="mt-1 text-[10px] text-text-muted uppercase tracking-wider">This might take a few moments</p>
          </div>
        ) : error ? (
          <EmptyState
            icon={<AlertCircle size={20} className="text-error" />}
            title="Tree unavailable"
            description={error}
          />
        ) : rootChildren.length === 0 ? (
          <EmptyState icon={<Folder size={20} />} title="Empty repository" />
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
