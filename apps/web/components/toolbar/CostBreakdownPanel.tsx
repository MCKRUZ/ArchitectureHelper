'use client';

import { useMemo } from 'react';
import { useDiagramState } from '@/lib/state/useDiagramState';
import type { AzureServiceType } from '@/lib/state/types';
import { COST_ESTIMATES } from '@/lib/waf/costEstimates';

interface CostBreakdownPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ServiceCostRow {
  nodeId: string;
  displayName: string;
  serviceType: AzureServiceType;
  sku: string;
  monthlyCost: number;
  group: string;
}

export function CostBreakdownPanel({ isOpen, onClose }: CostBreakdownPanelProps) {
  const { state, selectNode } = useDiagramState();

  const { rows, byGroup, byCategory, total } = useMemo(() => {
    const serviceNodes = state.nodes.filter(n => n.type !== 'group');
    const rowList: ServiceCostRow[] = serviceNodes.map(n => {
      const cost = n.data.monthlyCost ?? COST_ESTIMATES[n.data.serviceType as AzureServiceType] ?? 0;
      const parentNode = n.parentId ? state.nodes.find(p => p.id === n.parentId) : null;
      const groupName = parentNode?.data.displayName ?? 'Unassigned';

      return {
        nodeId: n.id,
        displayName: n.data.displayName,
        serviceType: n.data.serviceType as AzureServiceType,
        sku: n.data.sku || '',
        monthlyCost: cost,
        group: groupName,
      };
    });

    // Sort by cost descending
    rowList.sort((a, b) => b.monthlyCost - a.monthlyCost);

    // Group aggregates
    const groupAgg: Record<string, number> = {};
    const catAgg: Record<string, number> = {};
    let sum = 0;

    rowList.forEach(r => {
      sum += r.monthlyCost;
      groupAgg[r.group] = (groupAgg[r.group] ?? 0) + r.monthlyCost;
      catAgg[r.serviceType] = (catAgg[r.serviceType] ?? 0) + r.monthlyCost;
    });

    return {
      rows: rowList,
      byGroup: Object.entries(groupAgg).sort((a, b) => b[1] - a[1]),
      byCategory: Object.entries(catAgg).sort((a, b) => b[1] - a[1]),
      total: sum,
    };
  }, [state.nodes]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[520px] bg-card border-l shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Cost Breakdown</h2>
            <p className="text-sm text-muted-foreground">{state.diagramName}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                ${Math.round(total).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">est. monthly</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-accent transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              No services on the canvas yet.
            </div>
          ) : (
            <>
              {/* Summary by Resource Group */}
              <Section title="By Resource Group">
                {byGroup.map(([name, cost]) => (
                  <SummaryRow key={name} label={name} cost={cost} total={total} />
                ))}
              </Section>

              {/* Summary by Service Type */}
              <Section title="By Service Type">
                {byCategory.map(([svcType, cost]) => (
                  <SummaryRow
                    key={svcType}
                    label={svcType.replace(/-/g, ' ')}
                    cost={cost}
                    total={total}
                  />
                ))}
              </Section>

              {/* Full service list */}
              <Section title={`All Services (${rows.length})`}>
                <div className="space-y-0.5">
                  {rows.map(row => (
                    <button
                      key={row.nodeId}
                      onClick={() => { selectNode(row.nodeId); onClose(); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-accent/50 rounded-md transition-colors group"
                    >
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="text-sm font-medium truncate group-hover:text-primary">
                          {row.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {row.serviceType.replace(/-/g, ' ')}
                          {row.sku ? ` \u00B7 ${row.sku}` : ''}
                          {row.group !== 'Unassigned' ? ` \u00B7 ${row.group}` : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-mono font-semibold">
                          ${row.monthlyCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-muted-foreground">/mo</p>
                      </div>
                    </button>
                  ))}
                </div>
              </Section>

              {/* Footer total */}
              <div className="sticky bottom-0 bg-card border-t px-6 py-3 flex items-center justify-between">
                <span className="text-sm font-medium">Total Estimated Monthly Cost</span>
                <span className="text-lg font-bold font-mono">
                  ${Math.round(total).toLocaleString()}/mo
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b">
      <div className="px-6 py-2.5 bg-muted/50">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      </div>
      <div className="px-3 py-2">
        {children}
      </div>
    </div>
  );
}

function SummaryRow({ label, cost, total }: { label: string; cost: number; total: number }) {
  const pct = total > 0 ? (cost / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm capitalize truncate">{label}</span>
          <span className="text-sm font-mono ml-2">
            ${Math.round(cost).toLocaleString()}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-primary rounded-full h-1.5 transition-all"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-muted-foreground w-10 text-right flex-shrink-0">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}
