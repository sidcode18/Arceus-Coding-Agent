import React, { type ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div
    className={`flex flex-col items-center justify-center text-center px-6 py-10 text-text-muted ${className}`}
  >
    <div className="mb-3 opacity-60">{icon}</div>
    <p className="text-sm font-medium text-text-secondary">{title}</p>
    {description && <p className="text-xs mt-1 max-w-xs">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
