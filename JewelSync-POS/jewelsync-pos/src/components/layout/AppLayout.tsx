import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastProvider } from '@/components/ui/Toast';

export function AppLayout() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-[#FDFBF7] text-[#2D2A26]">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Content Viewport */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 overflow-x-hidden p-6 max-w-7xl w-full mx-auto animate-in fade-in duration-150">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
