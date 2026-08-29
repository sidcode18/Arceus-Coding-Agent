import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch,
  Plus,
  Trash2,
  FolderGit2,
  RefreshCw,
  Command,
  Search,
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
import { SettingsModal } from './SettingsModal';
import { useAuth } from '../context/AuthContext';
import { Onboarding } from './Onboarding';
import { UserMenu } from './ui/UserMenu';
import { getRelativeTime } from '../lib/date';


const StatusBadge: React.FC<{ project: Project }> = ({ project }) => {
  const map: Record<string, { icon: React.ReactNode; text: string; cls: string }> = {
    completed: {
      icon: <CheckCircle2 size={12} />,
      text: 'Ready',
      cls: 'text-success bg-success/10 border-success/20',
    },
    indexing: {
      icon: <Loader2 size={12} className="animate-spin" />,
      text: 'Indexing',
      cls: 'text-primary bg-primary/10 border-primary/20',
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
  const s = map[project.index_status] || map['pending'];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.cls}`}
    >
      {s.icon} {s.text}
    </span>
  );
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
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
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const handleDelete = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete workspace "${project.name}"?`)) return;
    try {
      await api.deleteProject(project.id);
      toast.success('Workspace deleted', project.name);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (err) {
      toast.error('Failed to delete workspace', extractError(err));
    }
  };

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const readyCount = projects.filter(p => p.index_status === 'completed' || p.is_indexed).length;
  const lastActiveProject = [...projects].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

  // Render onboarding flow for users with absolutely 0 projects (ignoring search)
  if (!loading && !error && projects.length === 0) {
    return <Onboarding />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-primary/30 relative">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>
      
      {/* Top Header */}
      <header className="h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-background-elevated border border-border flex items-center justify-center">
            <Command size={18} className="text-primary" />
          </div>
          <span className="font-medium text-text-primary">Arceus</span>
          <span className="text-text-muted">/</span>
          <span className="text-text-secondary">{user?.username}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <UserMenu onOpenSettings={() => setSettingsOpen(true)} />
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12 relative z-10">
        {/* Page Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-1">Workspaces</h1>
            <p className="text-sm text-text-muted">Manage your AI-powered development environments.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/new')}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold text-sm hover:bg-primary-hover transition-colors shadow-sm"
            >
              <Plus size={16} /> New Workspace
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              className="input pl-9 bg-background"
              placeholder="Search workspaces..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="hidden md:flex items-center gap-6 px-6 border-l border-border ml-2 text-sm">
            <div className="flex flex-col">
              <span className="text-text-muted text-xs">Total</span>
              <span className="font-semibold text-text-primary">{projects.length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-text-muted text-xs">Ready</span>
              <span className="font-semibold text-text-primary">{readyCount}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-text-muted text-xs">Last Activity</span>
              <span className="font-semibold text-text-primary">
                {lastActiveProject ? getRelativeTime(lastActiveProject.updated_at) : '--'}
              </span>
            </div>
          </div>
          
          <div className="flex-1" />
          <button onClick={() => load()} className="icon-btn border border-border shrink-0" title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Project Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <EmptyState
            icon={<AlertCircle size={32} className="text-error" />}
            title="Connection Error"
            description={error}
            action={<button onClick={() => load()} className="btn-secondary">Retry</button>}
          />
        ) : filteredProjects.length === 0 ? (
          <div className="py-20 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 bg-background-elevated rounded-2xl border border-border flex items-center justify-center mb-4 shadow-sm">
              <FolderGit2 size={28} className="text-text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">No workspaces found</h3>
            <p className="text-sm text-text-muted max-w-sm mb-6">
              {projects.length === 0 
                ? 'Get started by pasting a Git repository URL above to clone it.'
                : 'No workspaces match your search query.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/workspace/${project.id}`)}
                className="group flex flex-col p-5 bg-background border border-border rounded-xl cursor-pointer hover:border-primary/40 hover:shadow-glow transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-background-elevated border border-border flex items-center justify-center text-text-primary group-hover:text-primary group-hover:shadow-glow transition-all shrink-0">
                    <FolderGit2 size={20} />
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/workspace/${project.id}`); }}
                      className="px-2 py-1 rounded bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors"
                    >
                      Open
                    </button>
                    <button
                      onClick={(e) => handleDelete(project, e)}
                      className="p-1.5 rounded-md text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                      title="Delete Workspace"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-base font-semibold text-text-primary mb-1 truncate">{project.name}</h3>
                <p className="text-xs text-text-muted font-mono truncate mb-4" title={project.repository_url}>
                  {project.repository_url.replace('https://github.com/', '')}
                </p>
                
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/50">
                  <div className="flex items-center gap-3">
                    <StatusBadge project={project} />
                    <div className="flex items-center gap-1 text-[11px] font-medium text-text-secondary bg-background-elevated px-2 py-0.5 rounded border border-border">
                      <GitBranch size={10} />
                      {project.branch}
                    </div>
                  </div>
                  <span className="text-[10px] text-text-muted font-medium">
                    {getRelativeTime(project.updated_at)}
                  </span>
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
