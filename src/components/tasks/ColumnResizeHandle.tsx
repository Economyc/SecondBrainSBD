import { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ColumnResizeHandleProps {
  onResize: (delta: number) => void;
  onReset?: () => void;
  className?: string;
}

export function ColumnResizeHandle({ onResize, onReset, className }: ColumnResizeHandleProps) {
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startXRef.current = e.clientX;
    isDraggingRef.current = true;
    setIsDragging(true);
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const delta = e.clientX - startXRef.current;
    if (Math.abs(delta) >= 1) {
      onResize(delta);
      startXRef.current = e.clientX;
    }
  }, [onResize]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    setIsDragging(false);
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);
  }, []);

  return (
    <div
      className={cn(
        'w-3 shrink-0 self-stretch cursor-col-resize flex items-center justify-center group/resize',
        className
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={(e) => { e.stopPropagation(); onReset?.(); }}
    >
      <div className={cn(
        'w-[2px] h-full rounded-full transition-colors',
        'bg-border',
        'group-hover/resize:bg-primary/50',
        isDragging && 'bg-primary'
      )} />
    </div>
  );
}
