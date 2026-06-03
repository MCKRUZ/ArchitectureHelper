'use client';

import { cn } from '@/lib/utils';
import type { DeploymentStatusSnapshot } from '@/lib/api/deploy';

interface DeployStatusPanelProps {
  isOpen: boolean;
  onClose: () => void;
  deploymentName: string | null;
  status: DeploymentStatusSnapshot | null;
  portalUrl: string | null;
  error: string | null;
}

export function DeployStatusPanel({
  isOpen,
  onClose,
  deploymentName,
  status,
  portalUrl,
  error,
}: DeployStatusPanelProps) {
  if (!isOpen) return null;

  const state = status?.provisioningState ?? 'Starting';
  const isTerminal = ['Succeeded', 'Failed', 'Canceled'].includes(state);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-lg shadow-xl w-[480px] max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Deployment Status</h2>
            <span
              className={cn(
                'px-2 py-0.5 text-xs font-medium rounded-full',
                state === 'Succeeded' && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                state === 'Failed' && 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
                state === 'Running' && 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                !isTerminal && state !== 'Running' && 'bg-yellow-100 text-yellow-800',
              )}
            >
              {state}
            </span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            X
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {deploymentName && (
            <div className="text-sm">
              <span className="text-muted-foreground">Deployment: </span>
              <span className="font-mono text-xs">{deploymentName}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {status?.errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-300">
              {status.errorMessage}
            </div>
          )}

          {status?.resources && status.resources.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Resources</h3>
              <div className="space-y-1">
                {status.resources.map((r) => (
                  <div
                    key={`${r.resourceType}-${r.resourceName}`}
                    className="flex items-center justify-between text-xs py-1 px-2 bg-muted rounded"
                  >
                    <span className="font-mono truncate max-w-[200px]">{r.resourceName}</span>
                    <span
                      className={cn(
                        'font-medium',
                        r.provisioningState === 'Succeeded' && 'text-green-600',
                        r.provisioningState === 'Failed' && 'text-red-600',
                        r.provisioningState === 'Running' && 'text-blue-600',
                      )}
                    >
                      {r.provisioningState}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isTerminal && !error && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Deploying resources...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-between items-center">
          {portalUrl && (
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              View in Azure Portal
            </a>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 ml-auto"
          >
            {isTerminal ? 'Close' : 'Run in Background'}
          </button>
        </div>
      </div>
    </div>
  );
}
