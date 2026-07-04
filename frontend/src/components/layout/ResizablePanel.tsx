import React, { useState, useRef, useEffect, type ReactNode } from 'react';
import { GripVertical } from 'lucide-react';

interface ResizablePanelProps {
  children: ReactNode;
  direction: 'horizontal' | 'vertical';
  defaultSize: number;
  minSize?: number;
  maxSize?: number;
  className?: string;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  direction,
  defaultSize,
  minSize = 100,
  maxSize = 800,
  className = '',
}) => {
  const [size, setSize] = useState(defaultSize);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !panelRef.current) return;

      const rect = panelRef.current.getBoundingClientRect();
      
      if (direction === 'horizontal') {
        const newSize = e.clientX - rect.left;
        setSize(Math.max(minSize, Math.min(maxSize, newSize)));
      } else {
        const newSize = e.clientY - rect.top;
        setSize(Math.max(minSize, Math.min(maxSize, newSize)));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, direction, minSize, maxSize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const style = direction === 'horizontal' 
    ? { width: `${size}px`, minWidth: `${minSize}px`, maxWidth: `${maxSize}px` }
    : { height: `${size}px`, minHeight: `${minSize}px`, maxHeight: `${maxSize}px` };

  const resizerStyle = direction === 'horizontal'
    ? { right: '-4px', top: 0, bottom: 0, width: '8px', cursor: 'col-resize' }
    : { bottom: '-4px', left: 0, right: 0, height: '8px', cursor: 'row-resize' };

  return (
    <div
      ref={panelRef}
      className={`relative ${className}`}
      style={style}
    >
      {children}
      <div
        ref={resizerRef}
        className={`absolute z-10 flex items-center justify-center hover:bg-primary/20 transition-colors ${
          direction === 'horizontal' ? 'w-1' : 'h-1'
        }`}
        style={resizerStyle}
        onMouseDown={handleMouseDown}
      >
        <GripVertical size={12} className="text-text-muted opacity-0 hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};
