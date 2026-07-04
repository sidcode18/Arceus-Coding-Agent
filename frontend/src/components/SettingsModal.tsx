import React from 'react';
import { Settings as SettingsIcon, Moon, Sun, Keyboard } from 'lucide-react';
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

  return (
    <Modal open={open} onClose={onClose} title="Settings" icon={<SettingsIcon size={16} />}>
      <div className="space-y-6">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
            Appearance
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md border text-sm transition-colors ${
                theme === 'dark'
                  ? 'border-primary text-text-primary bg-primary/10'
                  : 'border-border text-text-secondary hover:bg-background-hover'
              }`}
            >
              <Moon size={14} /> Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md border text-sm transition-colors ${
                theme === 'light'
                  ? 'border-primary text-text-primary bg-primary/10'
                  : 'border-border text-text-secondary hover:bg-background-hover'
              }`}
            >
              <Sun size={14} /> Light
            </button>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2 flex items-center gap-1.5">
            <Keyboard size={13} /> Keyboard shortcuts
          </h3>
          <div className="space-y-1.5">
            {SHORTCUTS.map(([keys, desc]) => (
              <div key={keys} className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{desc}</span>
                <kbd className="px-2 py-0.5 bg-background-elevated border border-border rounded text-xs text-text-primary font-mono">
                  {keys}
                </kbd>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
            Connection
          </h3>
          <div className="text-sm text-text-secondary">
            API endpoint:{' '}
            <span className="font-mono text-text-primary break-all">{API_BASE}</span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Override with the <code className="font-mono">VITE_API_URL</code> environment variable.
          </p>
        </section>
      </div>
    </Modal>
  );
};
