import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer shadow-xs',
  {
    variants: {
      variant: {
        default: 'bg-[#C9A96E] text-white hover:bg-[#B89555] active:bg-[#A88545]',
        destructive: 'bg-[#C53030] text-white hover:bg-[#A82828]',
        outline: 'border border-[#E5DDD0] bg-white hover:bg-[#FAF7F2] text-[#2D2A26]',
        secondary: 'bg-[#FAF7F2] text-[#2D2A26] border border-[#E5DDD0] hover:bg-[#F5F0E8]',
        ghost: 'hover:bg-[#FAF7F2] text-[#2D2A26] shadow-none',
        link: 'text-[#C9A96E] underline-offset-4 hover:underline shadow-none',
        success: 'bg-[#2D6A4F] text-white hover:bg-[#23533E]',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
