import type { AzureServiceType } from '@/lib/state/types';

/** A single configurable field in a service's pricing form */
export interface PricingField {
  key: string;
  label: string;
  type: 'select' | 'number' | 'toggle';
  /** Options for select fields: value -> display label */
  options?: Array<{ value: string; label: string }>;
  /** Grouped options for select fields with optgroups */
  optionGroups?: Array<{ group: string; options: Array<{ value: string; label: string }> }>;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  tooltip?: string;
  /** Conditional visibility: field only shown when dependsOn condition is met */
  dependsOn?: { field: string; value: string | string[] };
  defaultValue?: string | number | boolean;
}

/** A single line item in the cost breakdown */
export interface CostLineItem {
  label: string;
  monthlyCost: number;
}

/** Full cost breakdown for a service */
export interface CostBreakdown {
  lineItems: CostLineItem[];
  totalMonthlyCost: number;
}

/** Descriptor for a single Azure service type's pricing model */
export interface ServicePricingDescriptor {
  serviceType: AzureServiceType;
  label: string;
  fields: PricingField[];
  getDefaultConfig: () => Record<string, unknown>;
  calculateCost: (config: Record<string, unknown>, region: string) => CostBreakdown;
}

/** Registry of all service pricing descriptors */
export type PricingDescriptorRegistry = Partial<Record<AzureServiceType, ServicePricingDescriptor>>;
