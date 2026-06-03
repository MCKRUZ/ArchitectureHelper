'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { MsalProvider } from '@azure/msal-react';
import {
  PublicClientApplication,
  EventType,
  type AuthenticationResult,
} from '@azure/msal-browser';
import { msalConfig } from './msalConfig';
import { setTokenProvider } from '@/lib/api/client';

let msalInstance: PublicClientApplication | null = null;

function getMsalInstance(): PublicClientApplication {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
  }
  return msalInstance;
}

interface MsalClientProviderProps {
  children: ReactNode;
}

export function MsalClientProvider({ children }: MsalClientProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const instance = getMsalInstance();

    instance.initialize().then(async () => {
      // Handle redirect response (after returning from login redirect)
      try {
        const response = await instance.handleRedirectPromise();
        if (response?.account) {
          instance.setActiveAccount(response.account);
        }
      } catch (err) {
        console.error('MSAL redirect handling failed:', err);
      }

      // Set active account from cache
      const accounts = instance.getAllAccounts();
      if (accounts.length > 0 && !instance.getActiveAccount()) {
        instance.setActiveAccount(accounts[0]);
      }

      // Listen for login events
      instance.addEventCallback((event) => {
        if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
          const result = event.payload as AuthenticationResult;
          instance.setActiveAccount(result.account);
        }
      });

      // Wire token provider into API client
      setTokenProvider(async () => {
        const activeAccount = instance.getActiveAccount();
        if (!activeAccount) return null;
        try {
          const result = await instance.acquireTokenSilent({
            scopes: ['https://management.azure.com/.default'],
            account: activeAccount,
          });
          return result.accessToken;
        } catch {
          return null;
        }
      });

      setIsInitialized(true);
    });
  }, []);

  if (!isInitialized) return null;

  return (
    <MsalProvider instance={getMsalInstance()}>
      {children}
    </MsalProvider>
  );
}
