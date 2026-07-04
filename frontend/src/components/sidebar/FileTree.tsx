import React, { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  File, 
  ChevronRight, 
  ChevronDown,
  Plus,
  Search,
  GitBranch,
  MoreVertical,
  FileCode,
  FileText,
  FileJson,
  Image,
  Globe
} from 'lucide-react';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  gitStatus?: 'added' | 'modified' | 'deleted' | 'none';
  language?: string;
}

interface FileTreeProps {
  onFileSelect: (file: FileNode) => void;
  selectedFile?: FileNode;
}

const mockFileTree: FileNode[] = [
  {
    id: '1',
    name: 'src',
    type: 'folder',
    gitStatus: 'modified',
    children: [
      {
        id: '2',
        name: 'components',
        type: 'folder',
        children: [
          { id: '3', name: 'Button.tsx', type: 'file', gitStatus: 'modified', language: 'typescript' },
          { id: '4', name: 'Card.tsx', type: 'file', gitStatus: 'none', language: 'typescript' },
          { id: '5', name: 'Modal.tsx', type: 'file', gitStatus: 'added', language: 'typescript' },
        ],
      },
      {
        id: '6',
        name: 'hooks',
        type: 'folder',
        children: [
          { id: '7', name: 'useTheme.ts', type: 'file', gitStatus: 'none', language: 'typescript' },
          { id: '8', name: 'useAuth.ts', type: 'file', gitStatus: 'none', language: 'typescript' },
        ],
      },
      {
        id: '9',
        name: 'utils',
        type: 'folder',
        children: [
          { id: '10', name: 'helpers.ts', type: 'file', gitStatus: 'added', language: 'typescript' },
          { id: '11', name: 'api.ts', type: 'file', gitStatus: 'none', language: 'typescript' },
          { id: '12', name: 'constants.ts', type: 'file', gitStatus: 'deleted', language: 'typescript' },
        ],
      },
      { id: '13', name: 'App.tsx', type: 'file', gitStatus: 'modified', language: 'typescript' },
      { id: '14', name: 'main.tsx', type: 'file', gitStatus: 'none', language: 'typescript' },
      { id: '15', name: 'index.css', type: 'file', gitStatus: 'none', language: 'css' },
    ],
  },
  {
    id: '16',
    name: 'public',
    type: 'folder',
    children: [
      { id: '17', name: 'index.html', type: 'file', gitStatus: 'none', language: 'html' },
      { id: '18', name: 'favicon.ico', type: 'file', gitStatus: 'none', language: 'image' },
    ],
  },
  {
    id: '19',
    name: 'tests',
    type: 'folder',
    children: [
      { id: '20', name: 'App.test.tsx', type: 'file', gitStatus: 'none', language: 'typescript' },
    ],
  },
  { id: '21', name: 'package.json', type: 'file', gitStatus: 'none', language: 'json' },
  { id: '22', name: 'tsconfig.json', type: 'file', gitStatus: 'none', language: 'json' },
  { id: '23', name: 'README.md', type: 'file', gitStatus: 'modified', language: 'markdown' },
  { id: '24', name: '.gitignore', type: 'file', gitStatus: 'none', language: 'text' },
];

const FileTreeNode: React.FC<{
  node: FileNode;
  level: number;
  selectedFile?: FileNode;
  onFileSelect: (file: FileNode) => void;
}> = ({ node, level, selectedFile, onFileSelect }) => {
  const [isExpanded, setIsExpanded] = useState(level < 1);
  const isSelected = selectedFile?.id === node.id;

  const gitStatusColors = {
    added: 'bg-git-added',
    modified: 'bg-git-modified',
    deleted: 'bg-git-deleted',
    none: 'bg-transparent',
  };

  const getFileIcon = (language?: string) => {
    const iconMap: Record<string, React.ElementType> = {
      typescript: FileCode,
      javascript: FileCode,
      python: FileCode,
      html: Globe,
      css: FileCode,
      json: FileJson,
      markdown: FileText,
      image: Image,
      text: FileText,
    };
    const Icon = iconMap[language || ''] || File;
    return <Icon size={14} />;
  };

  const getFileColor = (language?: string) => {
    const colorMap: Record<string, string> = {
      typescript: 'text-primary',
      javascript: 'text-warning',
      python: 'text-success',
      html: 'text-error',
      css: 'text-info',
      json: 'text-warning',
      markdown: 'text-text-secondary',
      image: 'text-text-secondary',
      text: 'text-text-muted',
    };
    return colorMap[language || ''] || 'text-text-muted';
  };

  if (node.type === 'folder') {
    return (
      <div>
        <div
          className={`flex items-center gap-2 px-2 py-1.5 hover:bg-background-hover cursor-pointer rounded-md transition-all duration-150 group ${
            isSelected ? 'bg-background-hover' : ''
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown size={12} className="text-text-muted transition-transform duration-150" />
          ) : (
            <ChevronRight size={12} className="text-text-muted transition-transform duration-150" />
          )}
          {isExpanded ? (
            <FolderOpen size={16} className="text-primary" />
          ) : (
            <Folder size={16} className="text-text-secondary" />
          )}
          <span className="text-sm text-text-primary truncate font-medium">{node.name}</span>
          {node.gitStatus && node.gitStatus !== 'none' && (
            <div className={`w-1.5 h-1.5 rounded-full ${gitStatusColors[node.gitStatus]} ml-1`} />
          )}
          <div className="ml-auto opacity-0 group-hover:opacity-100 flex gap-0.5">
            <button 
              className="p-1 hover:bg-background-elevated rounded transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Plus size={12} className="text-text-muted hover:text-text-primary" />
            </button>
            <button 
              className="p-1 hover:bg-background-elevated rounded transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical size={12} className="text-text-muted hover:text-text-primary" />
            </button>
          </div>
        </div>
        {isExpanded && node.children && (
          <div className="animate-fade-in">
            {node.children.map((child) => (
              <FileTreeNode
                key={child.id}
                node={child}
                level={level + 1}
                selectedFile={selectedFile}
                onFileSelect={onFileSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 hover:bg-background-hover cursor-pointer rounded-md transition-all duration-150 group ${
        isSelected ? 'bg-background-hover' : ''
      }`}
      style={{ paddingLeft: `${level * 12 + 24}px` }}
      onClick={() => onFileSelect(node)}
    >
      <div className={getFileColor(node.language)}>
        {getFileIcon(node.language)}
      </div>
      <span className="text-sm text-text-primary truncate flex-1">{node.name}</span>
      {node.gitStatus && node.gitStatus !== 'none' && (
        <div className={`w-1.5 h-1.5 rounded-full ${gitStatusColors[node.gitStatus]} ml-1`} />
      )}
      <div className="ml-auto opacity-0 group-hover:opacity-100 flex gap-0.5">
        <button 
          className="p-1 hover:bg-background-elevated rounded transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical size={12} className="text-text-muted hover:text-text-primary" />
        </button>
      </div>
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({ onFileSelect, selectedFile }) => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex flex-col h-full bg-background-sidebar">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GitBranch size={16} className="text-primary" />
            <span className="text-sm font-semibold text-text-primary">Explorer</span>
            <span className="text-xs text-text-muted bg-background-elevated px-1.5 py-0.5 rounded">main</span>
          </div>
          <div className="flex gap-0.5">
            <button className="p-1.5 hover:bg-background-hover rounded-md transition-colors" title="New File">
              <Plus size={14} className="text-text-muted hover:text-text-primary" />
            </button>
            <button className="p-1.5 hover:bg-background-hover rounded-md transition-colors" title="Collapse All">
              <ChevronDown size={14} className="text-text-muted hover:text-text-primary" />
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-0.5">
          {mockFileTree.map((node) => (
            <FileTreeNode
              key={node.id}
              node={node}
              level={0}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
