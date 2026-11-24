import React from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-xs font-semibold uppercase tracking-wider text-[#3D3A36] select-none block mb-1',
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="text-[#C53030] ml-1">*</span>}
      </label>
    );
  }
);
Label.displayName = 'Label';
