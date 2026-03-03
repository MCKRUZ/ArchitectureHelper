'use client';

import type { CostBreakdown } from '@/lib/pricing/types';

interface PricingLineItemsProps {
  breakdown: CostBreakdown;
  /** Effective discount percentage (0-100). When > 0, shows discount line and discounted total. */
  discountPercent?: number;
}

function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return '<$0.01';
  return `$${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PricingLineItems({ breakdown, discountPercent = 0 }: PricingLineItemsProps) {
  if (breakdown.lineItems.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">No cost data available.</p>
    );
  }

  const hasDiscount = discountPercent > 0;
  const discountAmount = breakdown.totalMonthlyCost * (discountPercent / 100);
  const discountedTotal = breakdown.totalMonthlyCost - discountAmount;

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

      <div className="border-t my-1" />

      {/* Base total (always shown when multiple line items) */}
      {(breakdown.lineItems.length > 1 || hasDiscount) && (
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>{hasDiscount ? 'Subtotal' : 'Total'}</span>
          <span className="font-mono">
            {formatCost(breakdown.totalMonthlyCost)}
          </span>
        </div>
      )}

      {/* Discount line */}
      {hasDiscount && (
        <>
          <div className="flex items-center justify-between text-sm text-green-600 dark:text-green-400">
            <span>Discount ({discountPercent}%)</span>
            <span className="font-mono">-{formatCost(discountAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Total</span>
            <span className="font-mono text-green-700 dark:text-green-300">
              {formatCost(discountedTotal)}
            </span>
          </div>
        </>
      )}

      {/* Single line item, no discount */}
      {breakdown.lineItems.length === 1 && !hasDiscount && (
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
