import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Settings as SettingsIcon, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const UserMenu: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded bg-gradient-to-br from-primary to-primary-active flex items-center justify-center text-xs font-bold text-white shadow-sm ring-1 ring-border hover:opacity-90 transition-opacity"
      >
        {user.username.charAt(0).toUpperCase()}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-background-elevated border border-border rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in origin-top-right">
          <div className="p-3 border-b border-border bg-background/50 flex flex-col">
            <span className="text-sm font-semibold text-text-primary truncate">{user.username}</span>
            <span className="text-xs text-text-muted truncate">{user.email}</span>
          </div>
          
          <div className="p-1">
            <button 
              onClick={() => { setOpen(false); onOpenSettings(); }}
              className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background-hover rounded flex items-center gap-2 transition-colors"
            >
              <SettingsIcon size={14} /> Settings
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleTheme();
              }}
              className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background-hover rounded flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />} Theme
              </div>
              <span className="text-xs text-text-muted capitalize">{theme}</span>
            </button>
            
            <div className="h-px bg-border my-1" />
            
            <button 
              onClick={logout}
              className="w-full text-left px-3 py-2 text-sm text-error hover:bg-error/10 rounded flex items-center gap-2 transition-colors"
            >
              <LogOut size={14} /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
