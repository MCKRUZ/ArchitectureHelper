import type { ServicePricingDescriptor, CostBreakdown } from '../types';
import { STORAGE_RATES, STORAGE_TRANSACTION_RATES, getRegionMultiplier } from '../rates';

export const storageAccountDescriptor: ServicePricingDescriptor = {
  serviceType: 'storage-account',
  label: 'Storage Account',
  fields: [
    {
      key: 'accessTier',
      label: 'Access Tier',
      type: 'select',
      options: [
        { value: 'hot', label: 'Hot' },
        { value: 'cool', label: 'Cool' },
        { value: 'archive', label: 'Archive' },
      ],
    },
    {
      key: 'redundancy',
      label: 'Redundancy',
      type: 'select',
      options: [
        { value: 'lrs', label: 'LRS (locally redundant)' },
        { value: 'zrs', label: 'ZRS (zone redundant)' },
        { value: 'grs', label: 'GRS (geo-redundant)' },
        { value: 'ragrs', label: 'RA-GRS (read-access geo-redundant)' },
      ],
    },
    {
      key: 'capacityGB',
      label: 'Capacity',
      type: 'number',
      min: 0,
      max: 500_000,
      step: 100,
      unit: 'GB',
    },
    {
      key: 'transactions10K',
      label: 'Transactions (10K ops/mo)',
      type: 'number',
      min: 0,
      max: 100_000,
      step: 10,
      unit: 'x10K',
    },
  ],
  getDefaultConfig: () => ({
    accessTier: 'hot',
    redundancy: 'lrs',
    capacityGB: 500,
    transactions10K: 100,
  }),
  calculateCost: (config, region): CostBreakdown => {
    const tier = config.accessTier as string;
    const redundancy = config.redundancy as string;
    const capacityGB = (config.capacityGB as number) || 0;
    const transactions10K = (config.transactions10K as number) || 0;
    const mul = getRegionMultiplier(region);

    const rateKey = `${tier}-${redundancy}`;
    const perGBRate = STORAGE_RATES[rateKey] ?? STORAGE_RATES[`${tier}-lrs`] ?? 0.018;
    const storageCost = capacityGB * perGBRate * mul;

    const txRate = STORAGE_TRANSACTION_RATES[tier] ?? 0.0044;
    const txCost = transactions10K * txRate * mul;

    return {
      lineItems: [
        { label: `Storage (${capacityGB} GB, ${tier}/${redundancy.toUpperCase()})`, monthlyCost: storageCost },
        ...(txCost > 0 ? [{ label: `Transactions (${transactions10K}x10K ops)`, monthlyCost: txCost }] : []),
      ],
      totalMonthlyCost: storageCost + txCost,
    };
  },
};
