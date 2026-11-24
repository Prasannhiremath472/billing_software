import React, { useCallback, useEffect, useState } from 'react';
import { Gem, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Login from '@/pages/Login';
import { login, logout, fetchCurrentUser, hasSession } from '@/services/auth';
import { AUTH_EXPIRED_EVENT, errorMessage } from '@/services/api-client';
import { loadAllData, clearDataCache } from '@/services/data-service';
import { useAppStore, usePOSStore } from '@/stores';
import type { Staff } from '@/types';

type Phase = 'checking' | 'signed-out' | 'loading' | 'ready' | 'error';

/** Shows the login screen until there is a valid session, then loads server data before rendering the app. */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>(hasSession() ? 'checking' : 'signed-out');
  const [loadError, setLoadError] = useState('');

  const bootstrap = useCallback(async (knownUser?: Staff) => {
    setPhase('loading');
    setLoadError('');
    try {
      const user = knownUser ?? (await fetchCurrentUser());
      await loadAllData();
      useAppStore.getState().initSession(user);
      setPhase('ready');
    } catch (err) {
      // A rejected token already triggers the auth-expired event; anything else is a load failure.
      if (hasSession()) {
        setLoadError(errorMessage(err, 'Unable to load store data.'));
        setPhase('error');
      }
    }
  }, []);

  useEffect(() => {
    if (hasSession()) void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const onExpired = () => {
      clearDataCache();
      usePOSStore.getState().clearCart();
      useAppStore.getState().endSession();
      setPhase('signed-out');
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    // A sign-out in another tab removes the shared token
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'jewelsync_token' && !e.newValue) onExpired();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  if (phase === 'signed-out') {
    return (
      <Login
        onSubmit={async (email, password) => {
          const user = await login(email, password);
          await bootstrap(user);
        }}
      />
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
        <div className="max-w-sm w-full rounded-xl border border-[#E5DDD0] bg-white p-6 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-[#C53030] mx-auto" />
          <h2 className="font-serif text-base font-semibold text-[#2D2A26]">Unable to load store data</h2>
          <p className="text-xs text-[#8A8278]">{loadError}</p>
          <div className="flex gap-2 justify-center">
            <Button size="sm" onClick={() => void bootstrap()}>Try again</Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                logout();
                setPhase('signed-out');
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase !== 'ready') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center gap-3 text-[#8A8278]" role="status" aria-live="polite">
        <div className="h-12 w-12 rounded-xl bg-[#2D2A26] text-[#C9A96E] flex items-center justify-center">
          <Gem className="h-6 w-6" />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{phase === 'checking' ? 'Checking your session…' : 'Loading store data…'}</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
