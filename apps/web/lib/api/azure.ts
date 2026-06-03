import { api } from './client';

export interface AzureSubscription {
  subscriptionId: string;
  displayName: string;
  state: string;
}

export interface AzureResourceGroup {
  name: string;
  location: string;
  provisioningState: string | null;
}

export async function listSubscriptions(): Promise<AzureSubscription[]> {
  return api.get<AzureSubscription[]>('/azure/subscriptions');
}

export async function listResourceGroups(
  subscriptionId: string,
): Promise<AzureResourceGroup[]> {
  return api.get<AzureResourceGroup[]>(
    `/azure/subscriptions/${subscriptionId}/resource-groups`,
  );
}
