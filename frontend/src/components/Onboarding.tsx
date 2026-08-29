import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link as LinkIcon, Loader2, ArrowRight, BookTemplate, FolderOpen, ArrowLeft } from 'lucide-react';
import { api, extractError } from '../api/client';
import { toast } from '../lib/toast';

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deriveName = (url: string): string => {
    const clean = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
    const parts = clean.split('/');
    return parts[parts.length - 1] || 'repository';
  };

  const handleClone = async (url: string) => {
    if (!url) return;
    setCreating(true);
    try {
      const pName = deriveName(url);
      const project = await api.createProject({
        name: pName,
        repository_url: url,
        branch: 'main',
      });
      // Redirect to the workspace, which will automatically show the IndexingProgress view
      navigate(`/workspace/${project.id}`);
    } catch (err) {
      toast.error('Failed to clone repository', extractError(err));
      setCreating(false);
    }
  };

  const handleLocalFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Extract root folder name from the first file's relative path
    const firstPath = files[0].webkitRelativePath || files[0].name;
    const folderName = firstPath.split('/')[0] || 'local-workspace';
    
    setCreating(true);
    try {
      const project = await api.createProject({
        name: folderName,
        repository_url: `local://${folderName}`,
        branch: 'main',
      });
      navigate(`/workspace/${project.id}`);
    } catch (err) {
      toast.error('Failed to create local workspace', extractError(err));
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 selection:bg-primary/30 relative">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>
      
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-info/5 blur-[120px] pointer-events-none z-0" />

      {/* Back button */}
      <button 
        onClick={() => navigate(-1)}
        className="absolute top-8 left-8 flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors text-sm font-medium z-20 bg-background-elevated/50 backdrop-blur border border-border px-4 py-2 rounded-lg"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="w-full max-w-xl bg-background-elevated border border-border rounded-2xl shadow-2xl overflow-hidden relative z-10 animate-fade-in-up">
        <div className="p-8 text-center border-b border-border bg-background/50">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl border border-primary/20 flex items-center justify-center mx-auto mb-6 shadow-glow">
            <BookTemplate size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight mb-2">Welcome to Arceus</h1>
          <p className="text-text-muted max-w-sm mx-auto">
            Let's set up your first workspace. Connect a GitHub repository or paste a public Git URL to get started.
          </p>
        </div>

        <div className="p-8 space-y-8">
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-3 uppercase tracking-wider">
              Import Repository
            </label>
            <form 
              onSubmit={(e) => { e.preventDefault(); handleClone(repoUrl); }}
              className="relative flex items-center group"
            >
              <div className="absolute left-3 text-text-muted group-focus-within:text-primary transition-colors">
                <LinkIcon size={18} />
              </div>
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                disabled={creating}
                className="w-full bg-background border border-border rounded-lg pl-10 pr-24 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-text-muted/50"
              />
              <button
                type="submit"
                disabled={!repoUrl || creating}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-primary text-primary-foreground font-semibold text-sm rounded hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <>Clone <ArrowRight size={16} /></>}
              </button>
            </form>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background-elevated px-4 text-xs font-medium text-text-muted uppercase tracking-widest">
                or
              </span>
            </div>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleLocalFolder} 
            className="hidden" 
            // @ts-ignore - webkitdirectory is non-standard but supported in all modern browsers
            webkitdirectory="true" 
            directory="true" 
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={creating}
            className="w-full flex items-center justify-center gap-3 p-4 bg-background border border-border rounded-xl hover:border-primary/50 hover:bg-background-hover hover:shadow-sm transition-all group disabled:opacity-50 text-left"
          >
            <FolderOpen className="text-text-muted group-hover:text-primary transition-colors" size={24} />
            <span className="text-base font-medium text-text-primary group-hover:text-primary transition-colors">
              Open Local Directory
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
