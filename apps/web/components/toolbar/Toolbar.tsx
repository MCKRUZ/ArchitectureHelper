'use client';

import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { useDiagramState } from '@/lib/state/useDiagramState';
import type { DiagramState, ArchReviewFinding } from '@/lib/state/types';
import { createInitialState } from '@/lib/state/types';
import { CostBreakdownPanel } from './CostBreakdownPanel';

export function Toolbar() {
  const { state, setDiagramName, clearDiagram, setState } = useDiagramState();
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);

  // Safety check for SSR/prerendering
  if (!state) return null;

  // Handle view mode change
  const handleViewModeChange = useCallback(
    (mode: DiagramState['viewMode']) => {
      setState((prev) => ({ ...(prev ?? createInitialState()), viewMode: mode }));
    },
    [setState]
  );

  // Handle export (placeholder)
  const handleExport = useCallback(() => {
    const exportData = JSON.stringify(state, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.diagramName.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  // Handle import (placeholder)
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importedState = JSON.parse(text) as DiagramState;
        setState(importedState);
      } catch {
        console.error('Failed to import diagram');
      }
    };
    input.click();
  }, [setState]);

  return (
    <>
      <div className="h-14 flex items-center justify-between px-4 bg-card border-b">
        {/* Left section - Diagram name */}
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={state.diagramName}
            onChange={(e) => setDiagramName(e.target.value)}
            className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary rounded px-2 py-1"
          />
          <span className="text-sm text-muted-foreground">v{state.version}</span>
        </div>

        {/* Center section - View modes */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <ViewModeButton
            label="2D"
            active={state.viewMode === '2d'}
            onClick={() => handleViewModeChange('2d')}
          />
          <ViewModeButton
            label="Isometric"
            active={state.viewMode === 'isometric'}
            onClick={() => handleViewModeChange('isometric')}
          />
          <ViewModeButton
            label="Cost"
            active={state.viewMode === 'cost-heatmap'}
            onClick={() => handleViewModeChange('cost-heatmap')}
          />
          <ViewModeButton
            label="Compliance"
            active={state.viewMode === 'compliance'}
            onClick={() => handleViewModeChange('compliance')}
          />
        </div>

        {/* Right section - Actions */}
        <div className="flex items-center gap-2">
          {/* Cost summary — clickable to open breakdown */}
          <CostSummaryBadge
            totalCost={state.costSummary.monthly}
            onClick={() => setShowCostBreakdown(true)}
          />

          {/* WAF badge — always visible */}
          <ValidationBadge results={state.validationResults} />

          {/* Action buttons */}
          <ToolbarButton onClick={handleImport} title="Import diagram">
            Import
          </ToolbarButton>
          <ToolbarButton onClick={handleExport} title="Export diagram">
            Export
          </ToolbarButton>
          <ToolbarButton
            onClick={clearDiagram}
            variant="destructive"
            title="Clear canvas"
          >
            Clear
          </ToolbarButton>
        </div>
      </div>

      {/* Cost breakdown slide-over */}
      <CostBreakdownPanel
        isOpen={showCostBreakdown}
        onClose={() => setShowCostBreakdown(false)}
      />
    </>
  );
}

// View mode toggle button
function ViewModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
    </button>
  );
}

// Generic toolbar button
function ToolbarButton({
  children,
  onClick,
  variant = 'default',
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
        variant === 'default' &&
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        variant === 'destructive' &&
          'text-destructive hover:bg-destructive/10'
      )}
    >
      {children}
    </button>
  );
}

// Cost summary badge — now clickable
function CostSummaryBadge({ totalCost, onClick }: { totalCost: number; onClick: () => void }) {
  const formatted = totalCost === 0 ? '$0' : `$${Math.round(totalCost).toLocaleString()}`;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900 rounded-md hover:bg-green-200 dark:hover:bg-green-800 transition-colors cursor-pointer"
      title="View cost breakdown"
    >
      <span className="text-xs text-green-700 dark:text-green-300">Est. Monthly</span>
      <span className="text-sm font-semibold text-green-800 dark:text-green-200">{formatted}</span>
    </button>
  );
}

// WAF validation results badge
function ValidationBadge({ results }: { results: ArchReviewFinding[] }) {
  const criticalCount = results.filter(r => r.severity === 'critical').length;
  const warningCount = results.filter(r => r.severity === 'warning').length;
  const total = results.length;

  const hasCritical = criticalCount > 0;
  const hasWarnings = warningCount > 0;

  // Green = pass, Yellow = warnings only, Red = critical issues
  const variant = hasCritical ? 'critical' : hasWarnings ? 'warning' : 'pass';

  const label = total === 0 ? 'WAF' : `WAF ${total}`;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md',
        variant === 'critical' && 'bg-red-100 dark:bg-red-900',
        variant === 'warning' && 'bg-yellow-100 dark:bg-yellow-900',
        variant === 'pass' && 'bg-green-100 dark:bg-green-900'
      )}
    >
      <span
        className={cn(
          'text-xs',
          variant === 'critical' && 'text-red-700 dark:text-red-300',
          variant === 'warning' && 'text-yellow-700 dark:text-yellow-300',
          variant === 'pass' && 'text-green-700 dark:text-green-300'
        )}
      >
        {label}
      </span>
      {total === 0 ? (
        <span className="text-sm font-semibold text-green-800 dark:text-green-200">Pass</span>
      ) : (
        <span
          className={cn(
            'text-sm font-semibold',
            variant === 'critical' && 'text-red-800 dark:text-red-200',
            variant === 'warning' && 'text-yellow-800 dark:text-yellow-200'
          )}
        >
          {hasCritical ? `${criticalCount}C ${warningCount}W` : `${warningCount}W`}
        </span>
      )}
    </div>
  );
}
