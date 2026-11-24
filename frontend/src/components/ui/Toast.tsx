import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  toast: (item: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback(({ title, description, type = 'info', duration = 4000 }: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = { id, title, description, type, duration };
    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismissToast }}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border bg-white shadow-lg animate-in slide-in-from-bottom-5 duration-200',
              t.type === 'success' && 'border-emerald-200 text-[#2D2A26]',
              t.type === 'error' && 'border-red-200 text-[#2D2A26]',
              t.type === 'warning' && 'border-amber-200 text-[#2D2A26]',
              t.type === 'info' && 'border-[#E5DDD0] text-[#2D2A26]'
            )}
          >
            {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
            {t.type === 'warning' && <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="h-5 w-5 text-[#C9A96E] shrink-0 mt-0.5" />}

            <div className="flex-1 min-w-0">
              <h5 className="text-sm font-semibold">{t.title}</h5>
              {t.description && <p className="text-xs text-[#8A8278] mt-0.5">{t.description}</p>}
            </div>

            <button
              onClick={() => dismissToast(t.id)}
              className="text-[#8A8278] hover:text-[#2D2A26] rounded p-0.5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
