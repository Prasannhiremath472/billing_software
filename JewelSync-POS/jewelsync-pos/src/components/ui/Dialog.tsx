import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#2D2A26]/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={() => onOpenChange(false)}
      />
      {/* Content */}
      <div className="relative z-50 w-full max-h-[90vh] overflow-y-auto rounded-xl border border-[#E5DDD0] bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200">
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  className,
  children,
  onClose,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }) {
  return (
    <div className={cn('flex items-start justify-between pb-4 border-b border-[#F5F0E8] mb-4', className)} {...props}>
      <div>{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-[#8A8278] hover:bg-[#FAF7F2] hover:text-[#2D2A26] transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('font-serif text-lg font-semibold text-[#2D2A26]', className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs text-[#8A8278] mt-1', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-end space-x-2 pt-4 border-t border-[#F5F0E8] mt-6', className)}
      {...props}
    />
  );
}
