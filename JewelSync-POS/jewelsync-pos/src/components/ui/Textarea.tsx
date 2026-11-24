import React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-[#E5DDD0] bg-white px-3 py-2 text-sm shadow-xs placeholder:text-[#8A8278] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A96E] focus-visible:border-[#C9A96E] disabled:cursor-not-allowed disabled:opacity-50 text-[#2D2A26]',
            error && 'border-[#C53030]',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-[#C53030]">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
