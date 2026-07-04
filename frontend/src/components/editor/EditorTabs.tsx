import React from 'react';
import { X, FileCode, FileJson, FileText, Globe, Image, File, Split } from 'lucide-react';

interface Tab {
  id: string;
  name: string;
  language: string;
  path?: string;
  isModified: boolean;
  isActive: boolean;
}

interface EditorTabsProps {
  tabs: Tab[];
  onTabClose: (id: string) => void;
  onTabSelect: (id: string) => void;
}

const fileIcons: Record<string, React.ElementType> = {
  typescript: FileCode,
  javascript: FileCode,
  python: FileCode,
  html: Globe,
  css: FileCode,
  json: FileJson,
  markdown: FileText,
  image: Image,
  txt: FileText,
};

const getLanguageColor = (language: string): string => {
  const colors: Record<string, string> = {
    typescript: 'text-primary',
    javascript: 'text-warning',
    python: 'text-success',
    html: 'text-error',
    css: 'text-info',
    json: 'text-warning',
    markdown: 'text-text-secondary',
    image: 'text-text-secondary',
    txt: 'text-text-muted',
  };
  return colors[language] || 'text-text-muted';
};

export const EditorTabs: React.FC<EditorTabsProps> = ({ tabs, onTabClose, onTabSelect }) => {
  return (
    <div className="flex flex-col bg-background-elevated border-b border-border">
      {/* Tabs */}
      <div className="flex items-center overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = fileIcons[tab.language] || File;
          
          return (
            <div
              key={tab.id}
              className={`flex items-center gap-2 px-3 py-2 border-r border-border cursor-pointer transition-all duration-150 group min-w-max relative ${
                tab.isActive
                  ? 'bg-background text-text-primary'
                  : 'text-text-secondary hover:bg-background hover:text-text-primary'
              }`}
              onClick={() => onTabSelect(tab.id)}
            >
              {tab.isActive && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
              )}
              <Icon size={14} className={getLanguageColor(tab.language)} />
              <span className="text-sm font-medium truncate max-w-[150px]">{tab.name}</span>
              {tab.isModified && (
                <div className="w-1.5 h-1.5 rounded-full bg-git-modified ml-1" />
              )}
              <button
                className={`ml-1 p-0.5 rounded hover:bg-background-hover transition-colors ${
                  tab.isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
              >
                <X size={12} className="text-text-muted hover:text-text-primary" />
              </button>
            </div>
          );
        })}
        
        {tabs.length === 0 && (
          <div className="flex items-center gap-2 px-4 py-2 text-text-muted text-sm">
            <FileCode size={14} />
            <span>No files open</span>
          </div>
        )}
      </div>

      {/* Breadcrumbs */}
      {tabs.length > 0 && (
        <div className="flex items-center px-3 py-1 border-t border-border bg-background text-xs text-text-muted">
          {tabs.find(t => t.isActive)?.path && (
            <>
              <span className="truncate">{tabs.find(t => t.isActive)?.path}</span>
              <span className="mx-1">/</span>
              <span className="text-text-primary truncate">{tabs.find(t => t.isActive)?.name}</span>
            </>
          )}
          {!tabs.find(t => t.isActive)?.path && (
            <span className="text-text-primary truncate">{tabs.find(t => t.isActive)?.name}</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button className="p-1 hover:bg-background-hover rounded transition-colors" title="Split Editor">
              <Split size={12} className="text-text-muted hover:text-text-primary" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
