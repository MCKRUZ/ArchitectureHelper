'use client';

import type { CostBreakdown } from '@/lib/pricing/types';

interface PricingLineItemsProps {
  breakdown: CostBreakdown;
}

function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return '<$0.01';
  return `$${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PricingLineItems({ breakdown }: PricingLineItemsProps) {
  if (breakdown.lineItems.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">No cost data available.</p>
    );
  }

  return (
    <div className="space-y-1">
      {breakdown.lineItems.map((item, idx) => (
        <div key={idx} className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground truncate mr-2">{item.label}</span>
          <span className="font-mono text-foreground whitespace-nowrap">
            {formatCost(item.monthlyCost)}
          </span>
        </div>
      ))}

      {breakdown.lineItems.length > 1 && (
        <>
          <div className="border-t my-1" />
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Total</span>
            <span className="font-mono">
              {formatCost(breakdown.totalMonthlyCost)}
            </span>
          </div>
        </>
      )}

      {breakdown.lineItems.length === 1 && (
        <div className="flex items-center justify-between text-sm font-semibold pt-1">
          <span>Total</span>
          <span className="font-mono">
            {formatCost(breakdown.totalMonthlyCost)}
          </span>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/60 pt-1">
        Est. monthly cost (USD) &middot; East US baseline
      </p>
    </div>
  );
}
