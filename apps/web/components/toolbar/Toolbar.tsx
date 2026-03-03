'use client';

import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { useDiagramState } from '@/lib/state/useDiagramState';
import type { DiagramState, ArchReviewFinding } from '@/lib/state/types';
import { createInitialState } from '@/lib/state/types';
import { CostBreakdownPanel } from './CostBreakdownPanel';

export function Toolbar() {
  const { state, setDiagramName, clearDiagram, setState, setGlobalDiscount } = useDiagramState();
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
            tooltip="Standard diagram view. Drag services, draw connections, and edit properties."
            active={state.viewMode === '2d'}
            onClick={() => handleViewModeChange('2d')}
          />
          <ViewModeButton
            label="Isometric"
            tooltip="3D isometric view of your architecture."
            active={state.viewMode === 'isometric'}
            onClick={() => handleViewModeChange('isometric')}
          />
          <ViewModeButton
            label="Cost"
            tooltip="Cost heatmap — nodes shift green → amber → red based on monthly spend. Cheapest services are green, most expensive are red."
            active={state.viewMode === 'cost-heatmap'}
            onClick={() => handleViewModeChange('cost-heatmap')}
          />
          <ViewModeButton
            label="Compliance"
            tooltip="WAF compliance overlay — node borders reflect Well-Architected Framework findings. Red = critical issue, amber = warning, green = no findings."
            active={state.viewMode === 'compliance'}
            onClick={() => handleViewModeChange('compliance')}
          />
        </div>

        {/* Right section - Actions */}
        <div className="flex items-center gap-2">
          {/* Global discount input */}
          <GlobalDiscountInput
            value={state.discounts?.globalPercent ?? 0}
            onChange={setGlobalDiscount}
          />

          {/* Cost summary — clickable to open breakdown */}
          <CostSummaryBadge
            totalCost={state.costSummary?.monthly ?? 0}
            discountPercent={state.discounts?.globalPercent ?? 0}
            onClick={() => setShowCostBreakdown(true)}
          />

          {/* WAF badge — always visible */}
          <ValidationBadge results={state.validationResults ?? []} />

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

      {/* Active mode info banner */}
      {state.viewMode === 'cost-heatmap' && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-950/60 border-b border-amber-800/40 text-amber-200 text-xs">
          <span className="text-amber-400 font-bold text-sm">💰</span>
          <span>
            <strong>Cost Heatmap</strong> — Node colour reflects monthly spend relative to the most expensive service.
            <span className="ml-2 text-amber-300/70">Green = cheapest · Amber = moderate · Red = most expensive</span>
          </span>
          <button
            onClick={() => handleViewModeChange('2d')}
            className="ml-auto text-amber-400 hover:text-amber-200 font-medium shrink-0"
          >
            ✕ Exit
          </button>
        </div>
      )}
      {state.viewMode === 'compliance' && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-950/60 border-b border-blue-800/40 text-blue-200 text-xs">
          <span className="text-blue-400 font-bold text-sm">🛡</span>
          <span>
            <strong>Compliance Overlay</strong> — Node borders reflect Well-Architected Framework findings.
            <span className="ml-2 text-blue-300/70">
              <span className="text-red-400 font-semibold">Red</span> = critical ·{' '}
              <span className="text-amber-400 font-semibold">Amber</span> = warning ·{' '}
              <span className="text-green-400 font-semibold">Green</span> = no findings
            </span>
            {(!state.validationResults || state.validationResults.length === 0) && (
              <span className="ml-2 text-blue-300/50 italic">— generate an architecture via AI to populate findings</span>
            )}
          </span>
          <button
            onClick={() => handleViewModeChange('2d')}
            className="ml-auto text-blue-400 hover:text-blue-200 font-medium shrink-0"
          >
            ✕ Exit
          </button>
        </div>
      )}

      {/* Cost breakdown slide-over */}
      <CostBreakdownPanel
        isOpen={showCostBreakdown}
        onClose={() => setShowCostBreakdown(false)}
      />
    </>
  );
}

// View mode toggle button with tooltip
function ViewModeButton({
  label,
  tooltip,
  active,
  onClick,
}: {
  label: string;
  tooltip: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div className="relative group">
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
      {/* Tooltip */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-md shadow-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed">
        {tooltip}
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-popover border-l border-t border-border rotate-45" />
      </div>
    </div>
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

// Global discount input — compact inline field in the toolbar
function GlobalDiscountInput({ value, onChange }: { value: number; onChange: (pct: number) => void }) {
  const hasDiscount = value > 0;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-colors',
        hasDiscount
          ? 'bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700'
          : 'bg-muted border-border'
      )}
      title="Global discount — applied to all services (e.g. EA, CSP, Reserved Instances)"
    >
      <span className={cn('text-xs', hasDiscount ? 'text-green-700 dark:text-green-300' : 'text-muted-foreground')}>
        Discount
      </span>
      <input
        type="number"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          'w-10 text-sm font-semibold text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded',
          hasDiscount ? 'text-green-800 dark:text-green-200' : 'text-foreground'
        )}
      />
      <span className={cn('text-xs', hasDiscount ? 'text-green-700 dark:text-green-300' : 'text-muted-foreground')}>%</span>
    </div>
  );
}

// Cost summary badge — shows discounted total when a global discount is active
function CostSummaryBadge({
  totalCost,
  discountPercent,
  onClick,
}: {
  totalCost: number;
  discountPercent: number;
  onClick: () => void;
}) {
  const hasDiscount = discountPercent > 0;
  const discountedCost = totalCost * (1 - discountPercent / 100);
  const displayed = hasDiscount ? discountedCost : totalCost;
  const formatted = displayed === 0 ? '$0' : `$${Math.round(displayed).toLocaleString()}`;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900 rounded-md hover:bg-green-200 dark:hover:bg-green-800 transition-colors cursor-pointer"
      title={hasDiscount ? `After ${discountPercent}% discount. Click for full breakdown.` : 'View cost breakdown'}
    >
      <span className="text-xs text-green-700 dark:text-green-300">
        {hasDiscount ? 'After Discount' : 'Est. Monthly'}
      </span>
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
