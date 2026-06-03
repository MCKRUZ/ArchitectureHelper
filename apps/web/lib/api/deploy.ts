import { api } from './client';
import type { DiagramExportDto } from './bicep';

export interface DeploymentResult {
  deploymentId: string;
  deploymentName: string;
  provisioningState: string;
  portalUrl: string | null;
}

export interface DeploymentStatusSnapshot {
  provisioningState: string;
  resources: DeploymentResourceStatus[];
  errorMessage: string | null;
  timestamp: string;
}

export interface DeploymentResourceStatus {
  resourceName: string;
  resourceType: string;
  provisioningState: string;
  errorMessage: string | null;
}

export async function deployDiagram(
  subscriptionId: string,
  resourceGroupName: string,
  region: string,
  diagram: DiagramExportDto,
): Promise<DeploymentResult> {
  return api.post<DeploymentResult>('/deploy', {
    subscriptionId,
    resourceGroupName,
    region,
    diagram,
  });
}

/** Subscribe to deployment status via SSE. */
export function subscribeToDeploymentStatus(
  deploymentName: string,
  subscriptionId: string,
  resourceGroupName: string,
  onStatus: (status: DeploymentStatusSnapshot) => void,
  onError: (error: string) => void,
): () => void {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:7001/api';
  const url = `${backendUrl}/deploy/${deploymentName}/status?subscriptionId=${subscriptionId}&resourceGroupName=${resourceGroupName}`;

  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const status = JSON.parse(event.data) as DeploymentStatusSnapshot;
      onStatus(status);

      if (['Succeeded', 'Failed', 'Canceled'].includes(status.provisioningState)) {
        eventSource.close();
      }
    } catch {
      onError('Failed to parse status event');
    }
  };

  eventSource.onerror = () => {
    onError('Connection to deployment status stream lost');
    eventSource.close();
  };

  return () => eventSource.close();
}
