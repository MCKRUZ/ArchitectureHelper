import type { AzureServiceType } from '@/lib/state/types';
import type { CostBreakdown } from './types';
import { PRICING_DESCRIPTORS } from './descriptors';
import { COST_ESTIMATES } from '@/lib/waf/costEstimates';

/**
 * Calculate itemized cost for a service given its pricing configuration.
 * Falls back to flat COST_ESTIMATES if no descriptor exists.
 */
export function calculateServiceCost(
  serviceType: AzureServiceType,
  config: Record<string, unknown>,
  region: string,
): CostBreakdown {
  const descriptor = PRICING_DESCRIPTORS[serviceType];

  if (!descriptor) {
    const flat = COST_ESTIMATES[serviceType] ?? 0;
    return {
      lineItems: flat > 0 ? [{ label: `${serviceType} (flat estimate)`, monthlyCost: flat }] : [],
      totalMonthlyCost: flat,
    };
  }

  return descriptor.calculateCost(config, region || 'eastus');
}

/**
 * Get default pricing configuration for a service type.
 */
export function getDefaultPricingConfig(serviceType: AzureServiceType): Record<string, unknown> {
  const descriptor = PRICING_DESCRIPTORS[serviceType];
  return descriptor ? descriptor.getDefaultConfig() : {};
}

/**
 * Derive a human-readable SKU string from pricing configuration.
 * e.g. "Standard S1 (2x)" or "GP 4 vCores" or "Consumption"
 */
export function deriveSku(serviceType: AzureServiceType, config: Record<string, unknown>): string {
  const descriptor = PRICING_DESCRIPTORS[serviceType];
  if (!descriptor) return '';

  // Build a SKU from the first select field's value + instance/count field
  const selectField = descriptor.fields.find(f => f.type === 'select');
  const countField = descriptor.fields.find(f =>
    f.type === 'number' && (
      f.key === 'instances' || f.key === 'count' ||
      f.key === 'nodeCount' || f.key === 'replicas' ||
      f.key === 'units' || f.key === 'shards'
    ),
  );

  if (!selectField) return '';

  const tierValue = config[selectField.key] as string | undefined;
  if (!tierValue) return '';

  // Find the label for the selected value
  let tierLabel = tierValue;
  if (selectField.options) {
    const opt = selectField.options.find(o => o.value === tierValue);
    if (opt) tierLabel = opt.label;
  } else if (selectField.optionGroups) {
    for (const group of selectField.optionGroups) {
      const opt = group.options.find(o => o.value === tierValue);
      if (opt) {
        tierLabel = opt.label;
        break;
      }
    }
  }

  // Strip parenthetical specs from label for brevity
  const shortLabel = tierLabel.replace(/\s*\(.*\)/, '');

  const count = countField ? (config[countField.key] as number) : undefined;
  if (count && count > 1) {
    return `${shortLabel} (${count}x)`;
  }
  return shortLabel;
}
