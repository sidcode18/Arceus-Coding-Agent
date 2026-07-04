import React, { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  icon?: ReactNode;
  widthClass?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  onClose,
  children,
  icon,
  widthClass = 'max-w-lg',
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full ${widthClass} panel shadow-panel-lg animate-fade-in-up`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 text-text-primary">
            {icon}
            <h2 className="text-sm font-semibold">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-background-hover rounded-md transition-colors text-text-muted hover:text-text-primary"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};
