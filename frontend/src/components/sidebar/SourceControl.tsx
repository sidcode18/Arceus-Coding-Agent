import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Minus, GitCommit, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { api, extractError } from '../../api/client';
import { toast } from '../../lib/toast';

interface SourceControlProps {
  projectId: string;
  reloadToken: number;
  onOpenFile: (path: string, diff?: boolean) => void;
}

interface GitFile {
  path: string;
  status: string; // 'M', 'A', 'D', '??' etc.
  staged: boolean;
}

export const SourceControl: React.FC<SourceControlProps> = ({ projectId, reloadToken, onOpenFile }) => {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<GitFile[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [committing, setCommitting] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.runCommand(projectId, 'git status --porcelain');
      if (result.exit_code !== 0) {
        throw new Error(result.stderr || 'Failed to get git status');
      }
      
      const lines = (result.stdout || '').split('\n').filter(l => l.trim().length > 0);
      const parsed: GitFile[] = lines.map(line => {
        const x = line[0];
        const y = line[1];
        const path = line.slice(3).trim();
        
        const isStaged = x !== ' ' && x !== '?';
        const isUnstaged = y !== ' ' && y !== '?';
        
        const fileEntries: GitFile[] = [];
        if (isStaged) {
          fileEntries.push({ path, status: x, staged: true });
        }
        if (isUnstaged || (x === '?' && y === '?')) {
          fileEntries.push({ path, status: y === '?' ? '??' : y, staged: false });
        }
        
        return fileEntries;
      }).flat();
      
      setFiles(parsed);
    } catch (err) {
      console.error(err);
      toast.error('Git Error', extractError(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus, reloadToken]);

  const runGitCommand = async (cmd: string, successMsg?: string) => {
    try {
      const res = await api.runCommand(projectId, cmd);
      if (res.exit_code !== 0) throw new Error(res.stderr || res.stdout);
      if (successMsg) toast.success(successMsg);
      await fetchStatus();
      return res.stdout;
    } catch (err) {
      toast.error('Git Error', extractError(err));
      return null;
    }
  };

  const stageAll = () => runGitCommand('git add -A');
  const unstageAll = () => runGitCommand('git reset');
  const stageFile = (path: string) => runGitCommand(`git add "${path}"`);
  const unstageFile = (path: string) => runGitCommand(`git reset HEAD "${path}"`);

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    setCommitting(true);
    const msg = commitMessage.replace(/"/g, '\\"');
    await runGitCommand(`git commit -m "${msg}"`, 'Changes committed');
    setCommitMessage('');
    setCommitting(false);
  };

  const handlePush = async () => {
    setPushing(true);
    await runGitCommand('git push', 'Changes pushed to remote');
    setPushing(false);
  };

  const handleGenerateMessage = async () => {
    setGenerating(true);
    try {
      // Run diff to see what's staged
      let diffRes = await api.runCommand(projectId, 'git diff --cached');
      let diff = diffRes.stdout || '';
      
      // If nothing staged, diff the working tree
      if (!diff.trim()) {
        diffRes = await api.runCommand(projectId, 'git diff');
        diff = diffRes.stdout || '';
      }
      
      if (!diff.trim()) {
        toast.info('No changes to commit');
        return;
      }

      // We cannot modify backend, so we try a basic heuristics or just placeholder since AI isn't available via simple text API
      setCommitMessage('Update files');
      toast.info('AI generation requires a backend endpoint. Using placeholder.');
      
    } catch (err) {
      toast.error('Failed to generate message', extractError(err));
    } finally {
      setGenerating(false);
    }
  };

  const stagedFiles = files.filter(f => f.staged);
  const unstagedFiles = files.filter(f => !f.staged);

  const statusColor = (status: string) => {
    if (status === 'A' || status === '??') return 'text-git-added';
    if (status === 'D') return 'text-git-deleted';
    return 'text-git-modified';
  };

  return (
    <div className="flex flex-col h-full bg-background-sidebar text-text-primary text-[13px] overflow-hidden select-none">
      <div className="flex items-center justify-between px-4 h-9 shrink-0 border-b border-border bg-background">
        <span className="font-semibold text-[11px] text-text-muted tracking-wide uppercase">Source Control</span>
        <div className="flex gap-1">
          <button onClick={fetchStatus} className="p-1 hover:bg-bg-hover rounded text-text-muted hover:text-text-primary transition-colors" title="Refresh">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 py-3">
        {/* Input Box */}
        <div className="px-3 mb-4 space-y-2">
          <div className="relative group">
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Message (⌘Enter to commit)"
              className="w-full bg-background-elevated border border-border rounded-md px-3 py-2 text-[13px] text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 min-h-[64px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleCommit();
                }
              }}
            />
            <button
              onClick={handleGenerateMessage}
              disabled={generating}
              className="absolute right-2 bottom-2 p-1.5 bg-background-elevated border border-border rounded-md text-text-muted hover:text-primary hover:border-primary/50 transition-all shadow-sm opacity-0 group-hover:opacity-100 disabled:opacity-50"
              title="Generate commit message"
            >
              {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCommit}
              disabled={committing || stagedFiles.length === 0 || !commitMessage.trim()}
              className="flex-1 btn-primary py-1.5 disabled:opacity-50 text-xs font-semibold"
            >
              {committing ? <Loader2 size={14} className="animate-spin mr-1" /> : <GitCommit size={14} className="mr-1" />} Commit
            </button>
            <button
              onClick={handlePush}
              disabled={pushing}
              className="btn-secondary py-1.5 px-3 text-xs font-semibold"
              title="Push"
            >
              {pushing ? <Loader2 size={14} className="animate-spin" /> : 'Push'}
            </button>
          </div>
        </div>

        {/* Staged Changes */}
        {stagedFiles.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between px-3 py-1 group">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                Staged Changes <span className="bg-background-elevated border border-border rounded-full px-1.5 text-[9px] text-text-primary">{stagedFiles.length}</span>
              </span>
              <button onClick={unstageAll} className="p-1 hover:bg-bg-hover rounded text-text-muted hover:text-text-primary transition-colors opacity-0 group-hover:opacity-100" title="Unstage All">
                <Minus size={12} />
              </button>
            </div>
            <div className="mt-1">
              {stagedFiles.map((f, i) => (
                <div key={`${f.path}-${i}`} className="flex items-center justify-between px-3 py-1 hover:bg-bg-hover group cursor-pointer" onClick={() => onOpenFile(f.path, true)}>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`font-mono text-[11px] font-bold ${statusColor(f.status)} w-4 text-center shrink-0`}>{f.status}</span>
                    <span className="truncate text-[13px]">{f.path.split('/').pop()}</span>
                    <span className="text-[10px] text-text-muted truncate hidden sm:block">{f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : ''}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); unstageFile(f.path); }}
                    className="p-1 rounded hover:bg-background-elevated text-text-muted hover:text-text-primary transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    title="Unstage"
                  >
                    <Minus size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unstaged Changes */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-3 py-1 group">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              Changes <span className="bg-background-elevated border border-border rounded-full px-1.5 text-[9px] text-text-primary">{unstagedFiles.length}</span>
            </span>
            {unstagedFiles.length > 0 && (
              <button onClick={stageAll} className="p-1 hover:bg-bg-hover rounded text-text-muted hover:text-text-primary transition-colors opacity-0 group-hover:opacity-100" title="Stage All">
                <Plus size={12} />
              </button>
            )}
          </div>
          <div className="mt-1">
            {unstagedFiles.length === 0 ? (
              <div className="px-4 py-2 text-text-muted text-[13px] italic">No changes</div>
            ) : (
              unstagedFiles.map((f, i) => (
                <div key={`${f.path}-${i}`} className="flex items-center justify-between px-3 py-1 hover:bg-bg-hover group cursor-pointer" onClick={() => onOpenFile(f.path, true)}>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`font-mono text-[11px] font-bold ${statusColor(f.status)} w-4 text-center shrink-0`}>{f.status}</span>
                    <span className="truncate text-[13px]">{f.path.split('/').pop()}</span>
                    <span className="text-[10px] text-text-muted truncate hidden sm:block">{f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : ''}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); stageFile(f.path); }}
                    className="p-1 rounded hover:bg-background-elevated text-text-muted hover:text-text-primary transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    title="Stage"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
