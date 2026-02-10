import type { ServicePricingDescriptor, CostBreakdown } from '../types';
import {
  APIM_RATES,
  SERVICE_BUS_RATES,
  EVENT_HUB_RATES,
  EVENT_GRID_RATES,
  getRegionMultiplier,
} from '../rates';

// ─── API Management ───────────────────────────────────────────────────────────

export const apiManagementDescriptor: ServicePricingDescriptor = {
  serviceType: 'api-management',
  label: 'API Management',
  fields: [
    {
      key: 'tier',
      label: 'Tier',
      type: 'select',
      options: [
        { value: 'consumption', label: 'Consumption (per call)' },
        { value: 'developer', label: 'Developer' },
        { value: 'basic', label: 'Basic' },
        { value: 'standard', label: 'Standard' },
        { value: 'premium', label: 'Premium' },
      ],
    },
    {
      key: 'millionCalls',
      label: 'Million Calls / month',
      type: 'number',
      min: 0,
      max: 1_000,
      step: 1,
      unit: 'M calls',
      dependsOn: { field: 'tier', value: 'consumption' },
    },
    {
      key: 'units',
      label: 'Scale Units',
      type: 'number',
      min: 1,
      max: 12,
      step: 1,
      unit: 'units',
      dependsOn: { field: 'tier', value: ['basic', 'standard', 'premium'] },
    },
  ],
  getDefaultConfig: () => ({ tier: 'developer', millionCalls: 1, units: 1 }),
  calculateCost: (config, region): CostBreakdown => {
    const tier = config.tier as string;
    const mul = getRegionMultiplier(region);

    if (tier === 'consumption') {
      const mCalls = (config.millionCalls as number) || 1;
      const cost = mCalls * APIM_RATES.consumption * mul;
      return {
        lineItems: [{ label: `Consumption (${mCalls}M calls)`, monthlyCost: cost }],
        totalMonthlyCost: cost,
      };
    }

    const baseRate = APIM_RATES[tier] ?? 48;
    const units = tier === 'developer' ? 1 : ((config.units as number) || 1);
    const cost = baseRate * units * mul;
    return {
      lineItems: [{ label: `${tier} (${units} unit${units > 1 ? 's' : ''})`, monthlyCost: cost }],
      totalMonthlyCost: cost,
    };
  },
};

// ─── Service Bus ──────────────────────────────────────────────────────────────

export const serviceBusDescriptor: ServicePricingDescriptor = {
  serviceType: 'service-bus',
  label: 'Service Bus',
  fields: [
    {
      key: 'tier',
      label: 'Tier',
      type: 'select',
      options: [
        { value: 'basic', label: 'Basic' },
        { value: 'standard', label: 'Standard' },
        { value: 'premium', label: 'Premium' },
      ],
    },
    {
      key: 'millionOps',
      label: 'Million Operations / month',
      type: 'number',
      min: 0,
      max: 10_000,
      step: 1,
      unit: 'M ops',
      dependsOn: { field: 'tier', value: ['basic', 'standard'] },
    },
    {
      key: 'messagingUnits',
      label: 'Messaging Units',
      type: 'number',
      min: 1,
      max: 16,
      step: 1,
      unit: 'MUs',
      dependsOn: { field: 'tier', value: 'premium' },
    },
  ],
  getDefaultConfig: () => ({ tier: 'standard', millionOps: 10, messagingUnits: 1 }),
  calculateCost: (config, region): CostBreakdown => {
    const tier = config.tier as string;
    const mul = getRegionMultiplier(region);

    if (tier === 'premium') {
      const mus = (config.messagingUnits as number) || 1;
      const cost = SERVICE_BUS_RATES.premium * mus * mul;
      return {
        lineItems: [{ label: `Premium (${mus} MUs)`, monthlyCost: cost }],
        totalMonthlyCost: cost,
      };
    }

    const mOps = (config.millionOps as number) || 10;
    if (tier === 'basic') {
      const cost = mOps * SERVICE_BUS_RATES.basic * mul;
      return {
        lineItems: [{ label: `Basic (${mOps}M ops)`, monthlyCost: cost }],
        totalMonthlyCost: cost,
      };
    }

    const baseCost = SERVICE_BUS_RATES.standard * mul;
    const opsCost = mOps * 0.01 * mul; // ~$0.01 per million after base
    return {
      lineItems: [
        { label: 'Standard (base)', monthlyCost: baseCost },
        { label: `Operations (${mOps}M)`, monthlyCost: opsCost },
      ],
      totalMonthlyCost: baseCost + opsCost,
    };
  },
};

// ─── Event Hub ────────────────────────────────────────────────────────────────

export const eventHubDescriptor: ServicePricingDescriptor = {
  serviceType: 'event-hub',
  label: 'Event Hubs',
  fields: [
    {
      key: 'tier',
      label: 'Tier',
      type: 'select',
      options: [
        { value: 'basic', label: 'Basic' },
        { value: 'standard', label: 'Standard' },
        { value: 'premium', label: 'Premium' },
        { value: 'dedicated', label: 'Dedicated' },
      ],
    },
    {
      key: 'throughputUnits',
      label: 'Throughput / Processing Units',
      type: 'number',
      min: 1,
      max: 40,
      step: 1,
      unit: 'TUs',
    },
  ],
  getDefaultConfig: () => ({ tier: 'standard', throughputUnits: 2 }),
  calculateCost: (config, region): CostBreakdown => {
    const tier = config.tier as string;
    const tus = (config.throughputUnits as number) || 1;
    const mul = getRegionMultiplier(region);
    const perUnit = EVENT_HUB_RATES[tier] ?? 21.90;
    const cost = perUnit * tus * mul;

    return {
      lineItems: [{ label: `${tier} (${tus} TUs)`, monthlyCost: cost }],
      totalMonthlyCost: cost,
    };
  },
};

// ─── Event Grid ───────────────────────────────────────────────────────────────

export const eventGridDescriptor: ServicePricingDescriptor = {
  serviceType: 'event-grid',
  label: 'Event Grid',
  fields: [
    {
      key: 'millionOps',
      label: 'Million Operations / month',
      type: 'number',
      min: 0,
      max: 10_000,
      step: 1,
      unit: 'M ops',
    },
  ],
  getDefaultConfig: () => ({ millionOps: 5 }),
  calculateCost: (config, region): CostBreakdown => {
    const mOps = (config.millionOps as number) || 0;
    const mul = getRegionMultiplier(region);
    const totalOps = mOps * 1_000_000;
    const billableOps = Math.max(0, totalOps - EVENT_GRID_RATES.freeGrant);
    const cost = (billableOps / 1_000_000) * EVENT_GRID_RATES.perMillionOps * mul;

    return {
      lineItems: [{ label: `Operations (${mOps}M, first 100K free)`, monthlyCost: cost }],
      totalMonthlyCost: cost,
    };
  },
};
