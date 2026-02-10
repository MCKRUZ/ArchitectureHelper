import type { ServicePricingDescriptor, CostBreakdown } from '../types';
import { STATIC_WEB_APP_RATES, getRegionMultiplier } from '../rates';

export const staticWebAppDescriptor: ServicePricingDescriptor = {
  serviceType: 'static-web-app',
  label: 'Static Web App',
  fields: [
    {
      key: 'tier',
      label: 'Plan',
      type: 'select',
      options: [
        { value: 'free', label: 'Free' },
        { value: 'standard', label: 'Standard ($9/mo)' },
      ],
    },
  ],
  getDefaultConfig: () => ({ tier: 'free' }),
  calculateCost: (config, region): CostBreakdown => {
    const tier = config.tier as string;
    const mul = getRegionMultiplier(region);
    const cost = (STATIC_WEB_APP_RATES[tier] ?? 0) * mul;

    return {
      lineItems: [{ label: `Static Web App (${tier})`, monthlyCost: cost }],
      totalMonthlyCost: cost,
    };
  },
};
