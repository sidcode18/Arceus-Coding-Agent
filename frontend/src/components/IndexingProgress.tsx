import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, Database, GitBranch, Code, HardDrive, TerminalSquare, Trash2 } from 'lucide-react';
import { api, extractError } from '../api/client';
import type { Project } from '../api/types';
import { toast } from '../lib/toast';

interface IndexingProgressProps {
  projectId: string;
  onComplete: () => void;
}

export const IndexingProgress: React.FC<IndexingProgressProps> = ({ projectId, onComplete }) => {
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkStatus = async () => {
      try {
        const p = await api.getProject(projectId);
        if (!mounted) return;
        setProject(p);
        
        if (p.index_status === 'completed' || p.is_indexed) {
          onComplete();
        } else if (p.index_status === 'failed') {
          setError('Indexing failed. The repository may be too large or require authentication.');
        } else {
          // Poll again
          setTimeout(checkStatus, 3000);
        }
      } catch (err) {
        if (!mounted) return;
        setError(extractError(err));
      }
    };

    checkStatus();

    return () => {
      mounted = false;
    };
  }, [projectId, onComplete]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this workspace and go back?')) return;
    setDeleting(true);
    try {
      await api.deleteProject(projectId);
      navigate('/');
    } catch (err) {
      toast.error('Failed to delete workspace', extractError(err));
      setDeleting(false);
    }
  };

  const status = project?.index_status || 'pending';
  
  // Fake deterministic steps based on time/status to make it feel alive without backend streaming
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (status === 'completed') {
      setStep(4);
      return;
    }
    if (status === 'failed') return;
    
    const interval = setInterval(() => {
      setStep(s => {
        if (s < 2 && status === 'pending') return s + 1; // Cloning -> Parsing
        if (s < 3 && status === 'indexing') return s + 1; // Parsing -> Embedding
        return s;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [status]);

  const steps = [
    { label: 'Cloning Repository', icon: GitBranch },
    { label: 'Analyzing Codebase', icon: Code },
    { label: 'Chunking & Embedding', icon: Database },
    { label: 'Saving to Vector Store', icon: HardDrive },
  ];

  if (!project && !error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 selection:bg-primary/30 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-lg bg-background-elevated border border-border rounded-2xl shadow-2xl overflow-hidden relative z-10 animate-fade-in-up">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-border bg-background/50 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-background-hover border border-border rounded-xl flex items-center justify-center mb-4 shadow-sm">
            <TerminalSquare size={24} className="text-text-secondary" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-1 truncate w-full">
            {project?.name || 'Workspace'}
          </h2>
          <p className="text-sm text-text-muted font-mono truncate w-full">
            {project?.repository_url}
          </p>
        </div>

        {/* Status Area */}
        <div className="p-8">
          {error || status === 'failed' ? (
            <div className="flex flex-col items-center text-center animate-fade-in">
              <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-4">
                <AlertCircle size={32} className="text-error" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Indexing Failed</h3>
              <p className="text-sm text-text-secondary mb-6">{error || 'An unknown error occurred during indexing.'}</p>
              
              <button 
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-error/10 text-error hover:bg-error/20 border border-error/20 rounded-md font-medium text-sm transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete Workspace
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                  <Loader2 size={18} className="animate-spin text-primary" />
                  Preparing Workspace...
                </h3>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                  {Math.min(99, Math.round((step / steps.length) * 100))}%
                </span>
              </div>

              <div className="space-y-4">
                {steps.map((s, i) => {
                  const isCompleted = i < step;
                  const isActive = i === step;
                  const Icon = s.icon;
                  
                  return (
                    <div key={i} className={`flex items-center gap-4 transition-all duration-500 ${isActive ? 'opacity-100' : isCompleted ? 'opacity-50' : 'opacity-20'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500 ${isCompleted ? 'bg-success/20 text-success' : isActive ? 'bg-primary/20 text-primary ring-2 ring-primary/20' : 'bg-background text-text-muted border border-border'}`}>
                        {isCompleted ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text-primary truncate">{s.label}</div>
                        {isActive && (
                          <div className="w-full h-1 bg-background rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-primary rounded-full animate-progress-indeterminate" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
