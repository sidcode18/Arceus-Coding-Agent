import React, { useState } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Keyboard, User, Sparkles } from 'lucide-react';
import { Modal } from './ui/Modal';
import { useTheme } from '../context/ThemeContext';
import { API_BASE } from '../api/client';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: [string, string][] = [
  ['Cmd/Ctrl + S', 'Save the active file'],
  ['Cmd/Ctrl + B', 'Toggle the file explorer'],
  ['Cmd/Ctrl + K', 'Focus repository search'],
  ['Cmd/Ctrl + Enter', 'Send message to the agent'],
  ['Esc', 'Close dialogs'],
];

export const SettingsModal: React.FC<Props> = ({ open, onClose }) => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'ai' | 'shortcuts'>('general');

  return (
    <Modal open={open} onClose={onClose} title="Settings" icon={<SettingsIcon size={16} />} className="sm:max-w-3xl sm:h-[500px]">
      <div className="flex h-[420px] -mx-6 -mb-6 border-t border-border">
        {/* Sidebar */}
        <div className="w-48 bg-background-elevated border-r border-border p-3 flex flex-col gap-1">
          <button 
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${activeTab === 'general' ? 'bg-background-hover text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <User size={14} /> General
          </button>
          <button 
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${activeTab === 'appearance' ? 'bg-background-hover text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <Sun size={14} /> Appearance
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${activeTab === 'ai' ? 'bg-background-hover text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <Sparkles size={14} /> AI Models
          </button>
          <button 
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${activeTab === 'shortcuts' ? 'bg-background-hover text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <Keyboard size={14} /> Shortcuts
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto bg-background">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-text-primary mb-4">Connection</h3>
                <div className="flex flex-col gap-2 p-4 bg-background-elevated border border-border rounded-lg w-full overflow-hidden shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                    <span className="text-sm text-text-secondary whitespace-nowrap font-medium">API endpoint</span>
                    <span className="font-mono text-sm text-primary truncate bg-primary/5 px-2 py-1 rounded border border-primary/10">{API_BASE}</span>
                  </div>
                  <p className="text-xs text-text-muted border-t border-border/60 pt-3 mt-1 leading-relaxed">
                    Override with the <code className="font-mono bg-background px-1.5 py-0.5 rounded border border-border text-text-secondary">VITE_API_URL</code> environment variable.
                  </p>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-text-primary mb-4">Theme</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex-1 flex flex-col items-center justify-center gap-3 p-4 rounded-lg border transition-colors ${
                      theme === 'dark'
                        ? 'border-primary text-primary bg-primary/5'
                        : 'border-border text-text-secondary hover:bg-background-hover hover:border-text-muted'
                    }`}
                  >
                    <Moon size={24} /> 
                    <span className="font-medium text-sm">Dark Theme</span>
                  </button>
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex-1 flex flex-col items-center justify-center gap-3 p-4 rounded-lg border transition-colors ${
                      theme === 'light'
                        ? 'border-primary text-primary bg-primary/5'
                        : 'border-border text-text-secondary hover:bg-background-hover hover:border-text-muted'
                    }`}
                  >
                    <Sun size={24} /> 
                    <span className="font-medium text-sm">Light Theme</span>
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-text-primary mb-4">AI Provider Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-text-secondary mb-1.5">Provider</label>
                    <select
                      className="w-full bg-background-elevated border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                      defaultValue={localStorage.getItem('llm_provider') || 'gemini'}
                      onChange={(e) => localStorage.setItem('llm_provider', e.target.value)}
                    >
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1.5">Model Name (Optional)</label>
                    <input
                      type="text"
                      className="w-full bg-background-elevated border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 placeholder-text-muted"
                      placeholder="e.g. gpt-4o, claude-3-5-sonnet-20240620"
                      defaultValue={localStorage.getItem('llm_model') || ''}
                      onChange={(e) => localStorage.setItem('llm_model', e.target.value)}
                    />
                    <p className="text-xs text-text-muted mt-1.5">
                      Leave blank to use the backend default for the selected provider.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-text-primary mb-4">Keyboard Shortcuts</h3>
                <div className="space-y-1 bg-background-elevated border border-border rounded-lg p-2">
                  {SHORTCUTS.map(([keys, desc], i) => (
                    <div key={keys} className={`flex items-center justify-between p-2 rounded ${i !== SHORTCUTS.length - 1 ? 'border-b border-border border-opacity-50' : ''}`}>
                      <span className="text-sm text-text-secondary">{desc}</span>
                      <kbd className="px-2 py-1 bg-background border border-border shadow-sm rounded text-xs text-text-primary font-mono font-medium">
                        {keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
