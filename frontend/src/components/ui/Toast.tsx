import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { subscribeToasts, dismissToast, type ToastData } from '../../lib/toast';

interface ToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const duration = toast.duration || 5000;
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(toast.id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const icons = {
    success: <CheckCircle size={16} className="text-success" />,
    error: <XCircle size={16} className="text-error" />,
    warning: <AlertTriangle size={16} className="text-warning" />,
    info: <Info size={16} className="text-info" />,
  };

  const bgColors = {
    success: 'border-success/20 bg-success/10',
    error: 'border-error/20 bg-error/10',
    warning: 'border-warning/20 bg-warning/10',
    info: 'border-info/20 bg-info/10',
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-panel-lg backdrop-blur-sm animate-slide-in-right ${
        bgColors[toast.type]
      } ${!isVisible ? 'opacity-0 translate-x-full' : ''}`}
      style={{ transition: 'all 0.3s ease-out' }}
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-text-secondary mt-1 break-words">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="p-1 hover:bg-background-hover rounded transition-colors text-text-muted hover:text-text-primary"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={dismissToast} />
      ))}
    </div>
  );
};
