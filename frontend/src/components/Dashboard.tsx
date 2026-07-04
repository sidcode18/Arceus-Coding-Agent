import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch,
  Plus,
  Trash2,
  FolderGit2,
  RefreshCw,
  Settings as SettingsIcon,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { api, extractError } from '../api/client';
import type { Project } from '../api/types';
import { toast } from '../lib/toast';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { EmptyState } from './ui/EmptyState';
import { ThemeToggle } from './ui/ThemeToggle';
import { SettingsModal } from './SettingsModal';

function deriveName(url: string): string {
  const clean = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
  const parts = clean.split('/');
  return parts[parts.length - 1] || 'repository';
}

const StatusBadge: React.FC<{ project: Project }> = ({ project }) => {
  const map: Record<string, { icon: React.ReactNode; text: string; cls: string }> = {
    completed: {
      icon: <CheckCircle2 size={12} />,
      text: 'Indexed',
      cls: 'text-success bg-success/10 border-success/20',
    },
    indexing: {
      icon: <Loader2 size={12} className="animate-spin" />,
      text: 'Indexing',
      cls: 'text-info bg-info/10 border-info/20',
    },
    pending: {
      icon: <Clock size={12} />,
      text: 'Pending',
      cls: 'text-warning bg-warning/10 border-warning/20',
    },
    failed: {
      icon: <AlertCircle size={12} />,
      text: 'Failed',
      cls: 'text-error bg-error/10 border-error/20',
    },
  };
  const s = map[project.index_status] || map.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${s.cls}`}
    >
      {s.icon}
      {s.text}
    </span>
  );
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.listProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while any project is still indexing.
  useEffect(() => {
    const pending = projects.some(
      (p) => p.index_status === 'pending' || p.index_status === 'indexing',
    );
    if (!pending) return;
    const id = setInterval(() => load(true), 4000);
    return () => clearInterval(id);
  }, [projects, load]);

  const handleClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setCreating(true);
    try {
      const project = await api.createProject({
        name: name.trim() || deriveName(repoUrl),
        repository_url: repoUrl.trim(),
        branch: branch.trim() || 'main',
      });
      toast.success('Repository cloning started', `Indexing "${project.name}" in the background.`);
      setRepoUrl('');
      setName('');
      setBranch('main');
      await load(true);
    } catch (err) {
      toast.error('Failed to clone repository', extractError(err));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete project "${project.name}"? This removes its workspace and index.`))
      return;
    try {
      await api.deleteProject(project.id);
      toast.success('Project deleted', project.name);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (err) {
      toast.error('Failed to delete project', extractError(err));
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border bg-background-elevated flex items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-active flex items-center justify-center shadow-glow-sm">
            <FolderGit2 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-text-primary leading-tight">Arceus</h1>
            <p className="text-xs text-text-muted leading-tight">AI Coding Workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => load()}
            className="p-2 hover:bg-background-hover rounded-md transition-colors text-text-muted hover:text-text-primary"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <ThemeToggle />
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 hover:bg-background-hover rounded-md transition-colors text-text-muted hover:text-text-primary"
            title="Settings"
          >
            <SettingsIcon size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
        {/* Clone form */}
        <section className="panel p-5 mb-8 animate-fade-in-up">
          <h2 className="text-sm font-semibold text-text-primary mb-1 flex items-center gap-2">
            <Plus size={16} className="text-primary" /> Clone a repository
          </h2>
          <p className="text-xs text-text-muted mb-4">
            Paste a public Git URL. Arceus clones it, then indexes it for semantic search.
          </p>
          <form onSubmit={handleClone} className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
            <input
              className="input sm:col-span-1"
              placeholder="https://github.com/owner/repo.git"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              required
            />
            <input
              className="input"
              placeholder="branch (main)"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
            <button type="submit" className="btn-primary flex items-center justify-center gap-2" disabled={creating}>
              {creating ? <Loader2 size={14} className="animate-spin" /> : <GitBranch size={14} />}
              {creating ? 'Cloning…' : 'Clone'}
            </button>
            <input
              className="input sm:col-span-3"
              placeholder="Display name (optional — defaults to repo name)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </form>
        </section>

        {/* Projects */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Workspaces {projects.length > 0 && <span className="text-text-muted">({projects.length})</span>}
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <EmptyState
            icon={<AlertCircle size={32} className="text-error" />}
            title="Couldn't reach the backend"
            description={error}
            action={
              <button onClick={() => load()} className="btn-secondary">
                Retry
              </button>
            }
          />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<FolderGit2 size={36} />}
            title="No workspaces yet"
            description="Clone your first repository above to get started."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/workspace/${project.id}`)}
                className="group panel p-4 cursor-pointer hover:border-primary/50 transition-all hover:shadow-glow-sm animate-fade-in"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderGit2 size={16} className="text-primary shrink-0" />
                    <span className="text-sm font-medium text-text-primary truncate">
                      {project.name}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(project, e)}
                    className="p-1 rounded text-text-muted hover:text-error hover:bg-error/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs text-text-muted font-mono truncate mb-3" title={project.repository_url}>
                  {project.repository_url}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusBadge project={project} />
                    <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                      <GitBranch size={11} />
                      {project.branch}
                    </span>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};
