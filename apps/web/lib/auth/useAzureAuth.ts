'use client';

import { useCallback, useMemo } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { loginRequest, azureManagementScope } from './msalConfig';

export function useAzureAuth() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const account = useMemo(() => accounts[0] ?? null, [accounts]);

  const login = useCallback(async () => {
    try {
      // Use redirect flow — more reliable with Next.js than popups
      await instance.loginRedirect(loginRequest);
    } catch (err) {
      console.error('MSAL login failed:', err);
    }
  }, [instance]);

  const logout = useCallback(async () => {
    try {
      await instance.logoutRedirect();
    } catch (err) {
      console.error('MSAL logout failed:', err);
    }
  }, [instance]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!account) return null;
    try {
      const result = await instance.acquireTokenSilent({
        scopes: [azureManagementScope],
        account,
      });
      return result.accessToken;
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        try {
          await instance.acquireTokenRedirect({
            scopes: [azureManagementScope],
          });
          return null;
        } catch (redirectErr) {
          console.error('Token redirect failed:', redirectErr);
          return null;
        }
      }
      console.error('Token acquisition failed:', err);
      return null;
    }
  }, [instance, account]);

  return {
    isAuthenticated,
    account,
    login,
    logout,
    getAccessToken,
    displayName: account?.name ?? null,
    email: account?.username ?? null,
  };
}
