import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#C9A96E] text-white',
        secondary: 'border-[#E5DDD0] bg-[#FAF7F2] text-[#3D3A36]',
        destructive: 'border-transparent bg-[#C53030]/10 text-[#C53030] border-[#C53030]/20',
        outline: 'text-[#2D2A26] border-[#E5DDD0]',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        warning: 'border-amber-200 bg-amber-50 text-amber-800',
        gold: 'border-[#C9A96E]/30 bg-[#C9A96E]/15 text-[#8F6F2C]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
