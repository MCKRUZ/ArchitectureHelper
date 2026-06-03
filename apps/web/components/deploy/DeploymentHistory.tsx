'use client';

import { cn } from '@/lib/utils';

export interface DeploymentRecord {
  deploymentName: string;
  diagramName: string;
  subscriptionId: string;
  resourceGroupName: string;
  status: 'Running' | 'Succeeded' | 'Failed' | 'Canceled';
  createdAt: string;
  portalUrl: string | null;
  errorMessage: string | null;
}

interface DeploymentHistoryProps {
  deployments: DeploymentRecord[];
  onRetry?: (deployment: DeploymentRecord) => void;
}

export function DeploymentHistory({ deployments, onRetry }: DeploymentHistoryProps) {
  if (deployments.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No deployments yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {deployments.map((d) => (
        <div
          key={d.deploymentName}
          className="flex items-center justify-between p-3 bg-muted rounded-md text-sm"
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{d.diagramName}</div>
            <div className="text-xs text-muted-foreground">
              {d.resourceGroupName} &middot; {new Date(d.createdAt).toLocaleString()}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-3">
            <span
              className={cn(
                'px-2 py-0.5 text-xs font-medium rounded-full',
                d.status === 'Succeeded' && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                d.status === 'Failed' && 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
                d.status === 'Running' && 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                d.status === 'Canceled' && 'bg-gray-100 text-gray-800',
              )}
            >
              {d.status}
            </span>

            {d.portalUrl && (
              <a
                href={d.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                Portal
              </a>
            )}

            {d.status === 'Failed' && onRetry && (
              <button
                onClick={() => onRetry(d)}
                className="text-xs text-blue-600 hover:underline"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
