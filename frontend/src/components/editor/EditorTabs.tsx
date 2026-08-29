import React from 'react';
import { X, FileCode, FileJson, FileText, Globe, File, ChevronRight, Image as ImageIcon, Layout, Database } from 'lucide-react';

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

const fileIcon = (name: string, language: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  
  if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext || '')) return <ImageIcon size={14} />;
  if (['tsx', 'jsx'].includes(ext || '')) return <Layout size={14} />;
  if (['sql', 'db'].includes(ext || '')) return <Database size={14} />;
  
  const icons: Record<string, React.ElementType> = {
    typescript: FileCode,
    javascript: FileCode,
    python: FileCode,
    html: Globe,
    css: FileCode,
    json: FileJson,
    markdown: FileText,
    txt: FileText,
  };
  const Icon = icons[language] || File;
  return <Icon size={14} />;
};

const getLanguageColor = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase();
  
  if (['ts', 'tsx'].includes(ext || '')) return 'text-blue-400';
  if (['js', 'jsx'].includes(ext || '')) return 'text-yellow-400';
  if (['json'].includes(ext || '')) return 'text-green-400';
  if (['py'].includes(ext || '')) return 'text-blue-500';
  if (['md'].includes(ext || '')) return 'text-purple-400';
  if (['html', 'css'].includes(ext || '')) return 'text-orange-400';
  
  return 'text-text-muted';
};

export const EditorTabs: React.FC<EditorTabsProps> = ({ tabs, onTabClose, onTabSelect }) => {
  const activeTab = tabs.find(t => t.isActive);

  return (
    <div className="flex flex-col bg-background h-full">
      {/* Tabs Row */}
      <div className="flex items-center overflow-x-auto border-b border-border min-h-[36px] bg-background-elevated">
        {tabs.map((tab) => {
          return (
            <div
              key={tab.id}
              className={`flex items-center gap-2 px-3 h-[36px] border-r border-border cursor-pointer transition-colors group min-w-[120px] max-w-[200px] relative ${
                tab.isActive
                  ? 'bg-background text-text-primary'
                  : 'text-text-secondary hover:bg-background-hover hover:text-text-primary'
              }`}
              onClick={() => onTabSelect(tab.id)}
              title={tab.path ? `${tab.path}/${tab.name}` : tab.name}
            >
              {tab.isActive && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />
              )}
              <span className={`${getLanguageColor(tab.name)} opacity-80 group-hover:opacity-100`}>
                {fileIcon(tab.name, tab.language)}
              </span>
              <span className={`text-[13px] truncate flex-1 ${tab.isActive ? 'font-medium' : ''}`}>
                {tab.name}
              </span>
              {tab.isModified && !tab.isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-git-modified mx-1 shrink-0" />
              )}
              <button
                className={`p-0.5 rounded-md hover:bg-background-elevated transition-colors shrink-0 ${
                  tab.isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
              >
                {tab.isModified && tab.isActive ? (
                   <div className="w-2 h-2 rounded-full bg-git-modified m-1" />
                ) : (
                  <X size={14} className="text-text-muted hover:text-text-primary" />
                )}
              </button>
            </div>
          );
        })}
        
        {tabs.length === 0 && (
          <div className="flex items-center gap-2 px-4 h-full text-text-muted text-[13px]">
            <span>No files open</span>
          </div>
        )}
      </div>

      {/* Breadcrumbs */}
      {activeTab && (
        <div className="flex items-center px-4 h-7 bg-background text-[12px] text-text-muted border-b border-border shadow-sm z-10">
          <div className="flex items-center gap-1 min-w-0">
            {activeTab.path ? (
              activeTab.path.split('/').map((segment, idx) => (
                <React.Fragment key={idx}>
                  <span className="hover:text-text-primary cursor-pointer transition-colors truncate">{segment}</span>
                  <ChevronRight size={12} className="text-border mx-0.5 shrink-0" />
                </React.Fragment>
              ))
            ) : null}
            <span className="flex items-center gap-1.5 text-text-primary truncate">
              <span className={getLanguageColor(activeTab.name)}>
                {fileIcon(activeTab.name, activeTab.language)}
              </span>
              {activeTab.name}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
