import type { ServicePricingDescriptor, CostBreakdown } from '../types';
import { AZURE_OPENAI_RATES, AI_SEARCH_RATES, getRegionMultiplier } from '../rates';

// ─── Azure OpenAI ─────────────────────────────────────────────────────────────

export const azureOpenaiDescriptor: ServicePricingDescriptor = {
  serviceType: 'azure-openai',
  label: 'Azure OpenAI Service',
  fields: [
    {
      key: 'model',
      label: 'Model',
      type: 'select',
      options: [
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-35-turbo', label: 'GPT-3.5 Turbo' },
        { value: 'text-embedding-ada-002', label: 'text-embedding-ada-002' },
        { value: 'text-embedding-3-small', label: 'text-embedding-3-small' },
      ],
    },
    {
      key: 'millionInputTokens',
      label: 'Input Tokens (millions/mo)',
      type: 'number',
      min: 0,
      max: 1_000,
      step: 1,
      unit: 'M tokens',
    },
    {
      key: 'millionOutputTokens',
      label: 'Output Tokens (millions/mo)',
      type: 'number',
      min: 0,
      max: 500,
      step: 1,
      unit: 'M tokens',
    },
  ],
  getDefaultConfig: () => ({
    model: 'gpt-4o',
    millionInputTokens: 10,
    millionOutputTokens: 5,
  }),
  calculateCost: (config, region): CostBreakdown => {
    const model = config.model as string;
    const inputM = (config.millionInputTokens as number) || 0;
    const outputM = (config.millionOutputTokens as number) || 0;
    const mul = getRegionMultiplier(region);
    const rates = AZURE_OPENAI_RATES[model] ?? AZURE_OPENAI_RATES['gpt-4o'];

    const inputCost = inputM * rates.perMillionInput * mul;
    const outputCost = outputM * rates.perMillionOutput * mul;

    const items = [{ label: `Input tokens (${inputM}M)`, monthlyCost: inputCost }];
    if (rates.perMillionOutput > 0) {
      items.push({ label: `Output tokens (${outputM}M)`, monthlyCost: outputCost });
    }

    return {
      lineItems: items,
      totalMonthlyCost: inputCost + outputCost,
    };
  },
};

// ─── AI Search ────────────────────────────────────────────────────────────────

export const aiSearchDescriptor: ServicePricingDescriptor = {
  serviceType: 'ai-search',
  label: 'Azure AI Search',
  fields: [
    {
      key: 'tier',
      label: 'Tier',
      type: 'select',
      options: [
        { value: 'free', label: 'Free' },
        { value: 'basic', label: 'Basic' },
        { value: 'standard-s1', label: 'Standard S1' },
        { value: 'standard-s2', label: 'Standard S2' },
        { value: 'standard-s3', label: 'Standard S3' },
      ],
    },
    {
      key: 'replicas',
      label: 'Replicas',
      type: 'number',
      min: 1,
      max: 12,
      step: 1,
      unit: 'replicas',
      dependsOn: { field: 'tier', value: ['basic', 'standard-s1', 'standard-s2', 'standard-s3'] },
    },
  ],
  getDefaultConfig: () => ({ tier: 'standard-s1', replicas: 1 }),
  calculateCost: (config, region): CostBreakdown => {
    const tier = config.tier as string;
    const replicas = (config.replicas as number) || 1;
    const mul = getRegionMultiplier(region);
    const rate = AI_SEARCH_RATES[tier] ?? 0;

    if (rate === 0) {
      return { lineItems: [{ label: 'AI Search (Free)', monthlyCost: 0 }], totalMonthlyCost: 0 };
    }

    const cost = rate * replicas * mul;
    return {
      lineItems: [{ label: `Search (${tier} x ${replicas})`, monthlyCost: cost }],
      totalMonthlyCost: cost,
    };
  },
};
