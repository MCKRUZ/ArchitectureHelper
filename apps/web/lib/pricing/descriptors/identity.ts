import type { ServicePricingDescriptor, CostBreakdown } from '../types';
import { ENTRA_ID_RATES, getRegionMultiplier } from '../rates';

export const entraIdDescriptor: ServicePricingDescriptor = {
  serviceType: 'entra-id',
  label: 'Microsoft Entra ID',
  fields: [
    {
      key: 'tier',
      label: 'Tier',
      type: 'select',
      options: [
        { value: 'free', label: 'Free' },
        { value: 'p1', label: 'P1 ($6/user/mo)' },
        { value: 'p2', label: 'P2 ($9/user/mo)' },
      ],
    },
    {
      key: 'users',
      label: 'Licensed Users',
      type: 'number',
      min: 0,
      max: 100_000,
      step: 10,
      unit: 'users',
      dependsOn: { field: 'tier', value: ['p1', 'p2'] },
    },
  ],
  getDefaultConfig: () => ({ tier: 'free', users: 50 }),
  calculateCost: (config, region): CostBreakdown => {
    const tier = config.tier as string;
    const users = (config.users as number) || 0;
    const mul = getRegionMultiplier(region);
    const perUser = ENTRA_ID_RATES[tier] ?? 0;

    if (tier === 'free' || perUser === 0) {
      return { lineItems: [{ label: 'Entra ID (Free)', monthlyCost: 0 }], totalMonthlyCost: 0 };
    }

    const cost = perUser * users * mul;
    return {
      lineItems: [{ label: `Entra ID ${tier.toUpperCase()} (${users} users)`, monthlyCost: cost }],
      totalMonthlyCost: cost,
    };
  },
};
