import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
  options?: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, children, options, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {label && <label className="text-xs font-semibold uppercase tracking-wider text-[#3D3A36] block mb-1">{label}</label>}
        <div className="relative">
          <select
            className={cn(
              'flex h-9 w-full appearance-none rounded-md border border-[#E5DDD0] bg-white px-3 py-1 pr-8 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A96E] focus-visible:border-[#C9A96E] disabled:cursor-not-allowed disabled:opacity-50 text-[#2D2A26] cursor-pointer',
              error && 'border-[#C53030]',
              className
            )}
            ref={ref}
            {...props}
          >
            {options
              ? options.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#8A8278]">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-[#C53030]">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
