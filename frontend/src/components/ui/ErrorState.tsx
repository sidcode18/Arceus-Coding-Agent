import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
  fullScreen?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
  fullScreen = false,
}) => {
  const content = (
    <div className={`flex flex-col items-center justify-center text-center p-6 animate-fade-in ${className}`}>
      <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mb-4 border border-error/20 shadow-sm">
        <AlertTriangle size={24} className="text-error" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-muted max-w-md mb-6">{message}</p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-primary"
        >
          <RefreshCw size={14} />
          Try Again
        </button>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        {content}
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center min-h-[200px] h-full w-full">
      {content}
    </div>
  );
};
