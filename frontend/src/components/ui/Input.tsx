import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            'flex h-9 w-full rounded-md border border-[#E5DDD0] bg-white px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#8A8278] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A96E] focus-visible:border-[#C9A96E] disabled:cursor-not-allowed disabled:opacity-50 text-[#2D2A26]',
            icon && 'pl-9',
            error && 'border-[#C53030] focus-visible:ring-[#C53030]',
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
Input.displayName = 'Input';
