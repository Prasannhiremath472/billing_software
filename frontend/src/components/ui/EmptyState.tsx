import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionText,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-[#E5DDD0] bg-[#FAF7F2]/50 my-4',
        className
      )}
    >
      <div className="h-12 w-12 rounded-full bg-[#FAF7F2] border border-[#E5DDD0] flex items-center justify-center text-[#C9A96E] mb-3">
        {icon}
      </div>
      <h4 className="font-serif text-base font-semibold text-[#2D2A26]">{title}</h4>
      <p className="text-xs text-[#8A8278] max-w-sm mt-1 mb-4">{description}</p>
      {actionText && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
