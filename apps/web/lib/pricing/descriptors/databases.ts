import type { ServicePricingDescriptor, CostBreakdown } from '../types';
import {
  AZURE_SQL_DTU_RATES,
  AZURE_SQL_VCORE_RATES,
  COSMOS_DB_RATES,
  REDIS_RATES,
  getRegionMultiplier,
} from '../rates';

// ─── Azure SQL ────────────────────────────────────────────────────────────────

export const azureSqlDescriptor: ServicePricingDescriptor = {
  serviceType: 'azure-sql',
  label: 'Azure SQL Database',
  fields: [
    {
      key: 'model',
      label: 'Purchasing Model',
      type: 'select',
      options: [
        { value: 'dtu', label: 'DTU-based' },
        { value: 'vcore', label: 'vCore-based' },
      ],
    },
    {
      key: 'dtuTier',
      label: 'DTU Tier',
      type: 'select',
      optionGroups: [
        {
          group: 'Basic',
          options: [
            { value: 'basic-5dtu', label: 'Basic (5 DTUs)' },
          ],
        },
        {
          group: 'Standard',
          options: [
            { value: 'standard-10dtu', label: 'Standard S0 (10 DTUs)' },
            { value: 'standard-20dtu', label: 'Standard S1 (20 DTUs)' },
            { value: 'standard-50dtu', label: 'Standard S2 (50 DTUs)' },
            { value: 'standard-100dtu', label: 'Standard S3 (100 DTUs)' },
          ],
        },
        {
          group: 'Premium',
          options: [
            { value: 'premium-125dtu', label: 'Premium P1 (125 DTUs)' },
            { value: 'premium-250dtu', label: 'Premium P2 (250 DTUs)' },
            { value: 'premium-500dtu', label: 'Premium P4 (500 DTUs)' },
          ],
        },
      ],
      dependsOn: { field: 'model', value: 'dtu' },
    },
    {
      key: 'vcoreTier',
      label: 'vCore Tier',
      type: 'select',
      options: [
        { value: 'general-purpose', label: 'General Purpose' },
        { value: 'business-critical', label: 'Business Critical' },
        { value: 'hyperscale', label: 'Hyperscale' },
      ],
      dependsOn: { field: 'model', value: 'vcore' },
    },
    {
      key: 'vcores',
      label: 'vCores',
      type: 'number',
      min: 2,
      max: 128,
      step: 2,
      unit: 'vCores',
      dependsOn: { field: 'model', value: 'vcore' },
    },
    {
      key: 'storageGB',
      label: 'Storage',
      type: 'number',
      min: 1,
      max: 4096,
      step: 10,
      unit: 'GB',
    },
  ],
  getDefaultConfig: () => ({
    model: 'dtu',
    dtuTier: 'standard-50dtu',
    vcoreTier: 'general-purpose',
    vcores: 4,
    storageGB: 250,
  }),
  calculateCost: (config, region): CostBreakdown => {
    const model = config.model as string;
    const mul = getRegionMultiplier(region);
    const storageGB = (config.storageGB as number) || 250;

    if (model === 'dtu') {
      const dtuTier = config.dtuTier as string;
      const rate = AZURE_SQL_DTU_RATES[dtuTier];
      if (!rate) return { lineItems: [], totalMonthlyCost: 0 };

      const computeCost = rate.base * mul;
      const includedStorage = dtuTier.startsWith('basic') ? 2 : dtuTier.startsWith('standard') ? 250 : 500;
      const extraStorage = Math.max(0, storageGB - includedStorage);
      const storageCost = extraStorage * rate.perExtraStorage * mul;

      return {
        lineItems: [
          { label: `Compute (${dtuTier})`, monthlyCost: computeCost },
          ...(storageCost > 0 ? [{ label: `Extra Storage (${extraStorage} GB)`, monthlyCost: storageCost }] : []),
        ],
        totalMonthlyCost: computeCost + storageCost,
      };
    }

    // vCore model
    const vcoreTier = config.vcoreTier as string;
    const vcores = (config.vcores as number) || 4;
    const rates = AZURE_SQL_VCORE_RATES[vcoreTier];
    if (!rates) return { lineItems: [], totalMonthlyCost: 0 };

    const computeCost = rates.perVcore * vcores * mul;
    const storageCost = storageGB * rates.perStorageGB * mul;

    return {
      lineItems: [
        { label: `Compute (${vcores} vCores, ${vcoreTier})`, monthlyCost: computeCost },
        { label: `Storage (${storageGB} GB)`, monthlyCost: storageCost },
      ],
      totalMonthlyCost: computeCost + storageCost,
    };
  },
};

// ─── Cosmos DB ────────────────────────────────────────────────────────────────

export const cosmosDbDescriptor: ServicePricingDescriptor = {
  serviceType: 'cosmos-db',
  label: 'Azure Cosmos DB',
  fields: [
    {
      key: 'throughputModel',
      label: 'Throughput Model',
      type: 'select',
      options: [
        { value: 'provisioned', label: 'Provisioned throughput' },
        { value: 'autoscale', label: 'Autoscale' },
        { value: 'serverless', label: 'Serverless' },
      ],
    },
    {
      key: 'ruPerSec',
      label: 'Request Units / sec',
      type: 'number',
      min: 400,
      max: 1_000_000,
      step: 100,
      unit: 'RU/s',
      dependsOn: { field: 'throughputModel', value: ['provisioned', 'autoscale'] },
    },
    {
      key: 'millionRequests',
      label: 'Million RUs / month',
      type: 'number',
      min: 0,
      max: 10_000,
      step: 1,
      unit: 'M RUs',
      dependsOn: { field: 'throughputModel', value: 'serverless' },
    },
    {
      key: 'storageGB',
      label: 'Storage',
      type: 'number',
      min: 1,
      max: 10_000,
      step: 10,
      unit: 'GB',
    },
  ],
  getDefaultConfig: () => ({
    throughputModel: 'provisioned',
    ruPerSec: 1000,
    millionRequests: 10,
    storageGB: 50,
  }),
  calculateCost: (config, region): CostBreakdown => {
    const model = config.throughputModel as string;
    const mul = getRegionMultiplier(region);
    const storageGB = (config.storageGB as number) || 50;

    if (model === 'serverless') {
      const millionReqs = (config.millionRequests as number) || 10;
      const ruCost = millionReqs * COSMOS_DB_RATES.serverless.perMillionRU * mul;
      const storageCost = storageGB * COSMOS_DB_RATES.serverless.perGBStorage * mul;
      return {
        lineItems: [
          { label: `Request Units (${millionReqs}M)`, monthlyCost: ruCost },
          { label: `Storage (${storageGB} GB)`, monthlyCost: storageCost },
        ],
        totalMonthlyCost: ruCost + storageCost,
      };
    }

    const ruPerSec = (config.ruPerSec as number) || 1000;
    const rateSet = model === 'autoscale' ? COSMOS_DB_RATES.autoscale : COSMOS_DB_RATES.provisioned;
    const ruCost = (ruPerSec / 100) * rateSet.per100RU * mul;
    const storageCost = storageGB * 0.25 * mul; // $0.25/GB

    return {
      lineItems: [
        { label: `Throughput (${ruPerSec} RU/s, ${model})`, monthlyCost: ruCost },
        { label: `Storage (${storageGB} GB)`, monthlyCost: storageCost },
      ],
      totalMonthlyCost: ruCost + storageCost,
    };
  },
};

// ─── Redis Cache ──────────────────────────────────────────────────────────────

export const redisCacheDescriptor: ServicePricingDescriptor = {
  serviceType: 'redis-cache',
  label: 'Azure Cache for Redis',
  fields: [
    {
      key: 'tier',
      label: 'Cache Tier / Size',
      type: 'select',
      optionGroups: [
        {
          group: 'Basic',
          options: [
            { value: 'basic-c0', label: 'Basic C0 (250 MB)' },
            { value: 'basic-c1', label: 'Basic C1 (1 GB)' },
            { value: 'basic-c2', label: 'Basic C2 (2.5 GB)' },
            { value: 'basic-c3', label: 'Basic C3 (6 GB)' },
          ],
        },
        {
          group: 'Standard (replicated)',
          options: [
            { value: 'standard-c0', label: 'Standard C0 (250 MB)' },
            { value: 'standard-c1', label: 'Standard C1 (1 GB)' },
            { value: 'standard-c2', label: 'Standard C2 (2.5 GB)' },
            { value: 'standard-c3', label: 'Standard C3 (6 GB)' },
          ],
        },
        {
          group: 'Premium',
          options: [
            { value: 'premium-p1', label: 'Premium P1 (6 GB)' },
            { value: 'premium-p2', label: 'Premium P2 (13 GB)' },
            { value: 'premium-p3', label: 'Premium P3 (26 GB)' },
            { value: 'premium-p4', label: 'Premium P4 (53 GB)' },
          ],
        },
      ],
    },
    {
      key: 'shards',
      label: 'Shard Count',
      type: 'number',
      min: 1,
      max: 10,
      step: 1,
      unit: 'shards',
      tooltip: 'Premium only: clustering for horizontal scale',
      dependsOn: { field: 'tier', value: ['premium-p1', 'premium-p2', 'premium-p3', 'premium-p4'] },
    },
  ],
  getDefaultConfig: () => ({ tier: 'standard-c1', shards: 1 }),
  calculateCost: (config, region): CostBreakdown => {
    const tier = config.tier as string;
    const shards = (config.shards as number) || 1;
    const mul = getRegionMultiplier(region);
    const baseRate = REDIS_RATES[tier] ?? 80;
    const isPremium = tier.startsWith('premium');
    const total = baseRate * (isPremium ? shards : 1) * mul;

    return {
      lineItems: [
        {
          label: `Cache (${tier}${isPremium && shards > 1 ? ` x ${shards} shards` : ''})`,
          monthlyCost: total,
        },
      ],
      totalMonthlyCost: total,
    };
  },
};
