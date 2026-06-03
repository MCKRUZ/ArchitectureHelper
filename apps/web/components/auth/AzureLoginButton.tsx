'use client';

import { cn } from '@/lib/utils';
import { useAzureAuth } from '@/lib/auth/useAzureAuth';

export function AzureLoginButton() {
  const { isAuthenticated, login, logout, displayName } = useAzureAuth();

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
          {displayName}
        </span>
        <button
          onClick={logout}
          className={cn(
            'px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          )}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className={cn(
        'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
        'bg-blue-600 text-white hover:bg-blue-700'
      )}
    >
      Sign in to Azure
    </button>
  );
}
