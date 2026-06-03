import type { Configuration, PopupRequest } from '@azure/msal-browser';

const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ?? '';
const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID ?? 'common';

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
    postLogoutRedirectUri: typeof window !== 'undefined' ? window.location.origin : '',
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
};

export const loginRequest: PopupRequest = {
  scopes: [
    'https://management.azure.com/.default',
    'openid',
    'profile',
  ],
};

export const azureManagementScope = 'https://management.azure.com/.default';
