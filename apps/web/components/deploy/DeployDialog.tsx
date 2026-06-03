'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAzureAuth } from '@/lib/auth/useAzureAuth';
import {
  listSubscriptions,
  listResourceGroups,
  type AzureSubscription,
  type AzureResourceGroup,
} from '@/lib/api/azure';
import type { DiagramState } from '@/lib/state/types';

interface DeployDialogProps {
  isOpen: boolean;
  onClose: () => void;
  state: DiagramState;
  onDeploy: (subscriptionId: string, resourceGroupName: string, region: string) => void;
  isDeploying: boolean;
}

type Step = 'subscription' | 'resource-group' | 'confirm';

export function DeployDialog({
  isOpen,
  onClose,
  state,
  onDeploy,
  isDeploying,
}: DeployDialogProps) {
  const { isAuthenticated, login } = useAzureAuth();
  const [step, setStep] = useState<Step>('subscription');

  // Data
  const [subscriptions, setSubscriptions] = useState<AzureSubscription[]>([]);
  const [resourceGroups, setResourceGroups] = useState<AzureResourceGroup[]>([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);
  const [isLoadingRgs, setIsLoadingRgs] = useState(false);

  // Selections
  const [selectedSub, setSelectedSub] = useState<AzureSubscription | null>(null);
  const [selectedRg, setSelectedRg] = useState<AzureResourceGroup | null>(null);
  const [costConfirmed, setCostConfirmed] = useState(false);

  // Load subscriptions
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    setIsLoadingSubs(true);
    listSubscriptions()
      .then(setSubscriptions)
      .catch(() => setSubscriptions([]))
      .finally(() => setIsLoadingSubs(false));
  }, [isOpen, isAuthenticated]);

  // Load resource groups when subscription changes
  useEffect(() => {
    if (!selectedSub) return;
    setIsLoadingRgs(true);
    listResourceGroups(selectedSub.subscriptionId)
      .then(setResourceGroups)
      .catch(() => setResourceGroups([]))
      .finally(() => setIsLoadingRgs(false));
  }, [selectedSub]);

  const handleSelectSub = useCallback((sub: AzureSubscription) => {
    setSelectedSub(sub);
    setSelectedRg(null);
    setStep('resource-group');
  }, []);

  const handleSelectRg = useCallback((rg: AzureResourceGroup) => {
    setSelectedRg(rg);
    setStep('confirm');
    setCostConfirmed(false);
  }, []);

  const handleDeploy = useCallback(() => {
    if (!selectedSub || !selectedRg || !costConfirmed) return;
    onDeploy(selectedSub.subscriptionId, selectedRg.name, selectedRg.location);
  }, [selectedSub, selectedRg, costConfirmed, onDeploy]);

  if (!isOpen) return null;

  const totalCost = state.costSummary?.monthly ?? 0;
  const serviceNodes = state.nodes.filter(
    (n) => !n.data.groupType,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-lg shadow-xl w-[560px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Deploy to Azure</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            X
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!isAuthenticated ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Sign in with your Azure account to deploy.</p>
              <button
                onClick={login}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Sign in to Azure
              </button>
            </div>
          ) : step === 'subscription' ? (
            <div>
              <h3 className="text-sm font-medium mb-3">Select Subscription</h3>
              {isLoadingSubs ? (
                <p className="text-sm text-muted-foreground">Loading subscriptions...</p>
              ) : subscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subscriptions found.</p>
              ) : (
                <div className="space-y-1">
                  {subscriptions.map((sub) => (
                    <button
                      key={sub.subscriptionId}
                      onClick={() => handleSelectSub(sub)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors',
                        selectedSub?.subscriptionId === sub.subscriptionId && 'bg-muted font-medium',
                      )}
                    >
                      <div className="font-medium">{sub.displayName}</div>
                      <div className="text-xs text-muted-foreground">{sub.subscriptionId}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : step === 'resource-group' ? (
            <div>
              <button
                onClick={() => setStep('subscription')}
                className="text-xs text-muted-foreground hover:text-foreground mb-3 block"
              >
                &larr; Back to subscriptions
              </button>
              <h3 className="text-sm font-medium mb-3">
                Select Resource Group in {selectedSub?.displayName}
              </h3>
              {isLoadingRgs ? (
                <p className="text-sm text-muted-foreground">Loading resource groups...</p>
              ) : resourceGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No resource groups found.</p>
              ) : (
                <div className="space-y-1">
                  {resourceGroups.map((rg) => (
                    <button
                      key={rg.name}
                      onClick={() => handleSelectRg(rg)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors',
                        selectedRg?.name === rg.name && 'bg-muted font-medium',
                      )}
                    >
                      <div className="font-medium">{rg.name}</div>
                      <div className="text-xs text-muted-foreground">{rg.location}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <button
                onClick={() => setStep('resource-group')}
                className="text-xs text-muted-foreground hover:text-foreground mb-3 block"
              >
                &larr; Back to resource groups
              </button>

              <h3 className="text-sm font-medium mb-4">Confirm Deployment</h3>

              {/* Summary */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subscription</span>
                  <span className="font-medium">{selectedSub?.displayName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resource Group</span>
                  <span className="font-medium">{selectedRg?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Region</span>
                  <span className="font-medium">{selectedRg?.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resources</span>
                  <span className="font-medium">{serviceNodes.length} services</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. Monthly Cost</span>
                  <span className="font-semibold text-amber-600">
                    ${Math.round(totalCost).toLocaleString()}/mo
                  </span>
                </div>
              </div>

              {/* Resource list */}
              <div className="mt-4 p-3 bg-muted rounded-md max-h-40 overflow-y-auto">
                <p className="text-xs font-medium mb-2">Resources to create:</p>
                {serviceNodes.map((node) => (
                  <div key={node.id} className="text-xs text-muted-foreground py-0.5">
                    {node.data.displayName} ({node.data.serviceType})
                  </div>
                ))}
              </div>

              {/* Cost confirmation */}
              <label className="flex items-start gap-2 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={costConfirmed}
                  onChange={(e) => setCostConfirmed(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-xs text-muted-foreground">
                  I understand this will create Azure resources that incur costs.
                  Estimated monthly cost: ${Math.round(totalCost).toLocaleString()}.
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        {isAuthenticated && step === 'confirm' && (
          <div className="px-6 py-4 border-t flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Cancel
            </button>
            <button
              onClick={handleDeploy}
              disabled={!costConfirmed || isDeploying}
              className={cn(
                'px-4 py-2 text-sm rounded-md font-medium transition-colors',
                costConfirmed && !isDeploying
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              {isDeploying ? 'Deploying...' : 'Deploy'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
