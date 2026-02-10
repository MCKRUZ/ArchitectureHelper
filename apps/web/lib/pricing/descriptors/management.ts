import type { ServicePricingDescriptor, CostBreakdown } from '../types';
import { LOG_ANALYTICS_RATES, APP_INSIGHTS_RATES, getRegionMultiplier } from '../rates';

// ─── Log Analytics ────────────────────────────────────────────────────────────

export const logAnalyticsDescriptor: ServicePricingDescriptor = {
  serviceType: 'log-analytics',
  label: 'Log Analytics Workspace',
  fields: [
    {
      key: 'ingestionGB',
      label: 'Data Ingestion',
      type: 'number',
      min: 0,
      max: 10_000,
      step: 10,
      unit: 'GB/mo',
      tooltip: 'First 5 GB/mo free',
    },
    {
      key: 'retentionDays',
      label: 'Retention Period',
      type: 'number',
      min: 31,
      max: 730,
      step: 30,
      unit: 'days',
      tooltip: 'First 31 days free',
    },
  ],
  getDefaultConfig: () => ({ ingestionGB: 50, retentionDays: 90 }),
  calculateCost: (config, region): CostBreakdown => {
    const ingestionGB = (config.ingestionGB as number) || 0;
    const retentionDays = (config.retentionDays as number) || 31;
    const mul = getRegionMultiplier(region);

    const billableGB = Math.max(0, ingestionGB - LOG_ANALYTICS_RATES.freeGrantGB);
    const ingestionCost = billableGB * LOG_ANALYTICS_RATES.perGBIngestion * mul;

    const extraRetentionDays = Math.max(0, retentionDays - LOG_ANALYTICS_RATES.retentionFreedays);
    const retentionPeriods = Math.ceil(extraRetentionDays / 30);
    const retentionCost = ingestionGB * retentionPeriods * LOG_ANALYTICS_RATES.perGBRetentionExtraDays * mul;

    return {
      lineItems: [
        { label: `Ingestion (${ingestionGB} GB, 5 GB free)`, monthlyCost: ingestionCost },
        ...(retentionCost > 0 ? [{ label: `Retention (${retentionDays} days)`, monthlyCost: retentionCost }] : []),
      ],
      totalMonthlyCost: ingestionCost + retentionCost,
    };
  },
};

// ─── Application Insights ─────────────────────────────────────────────────────

export const applicationInsightsDescriptor: ServicePricingDescriptor = {
  serviceType: 'application-insights',
  label: 'Application Insights',
  fields: [
    {
      key: 'ingestionGB',
      label: 'Data Ingestion',
      type: 'number',
      min: 0,
      max: 5_000,
      step: 5,
      unit: 'GB/mo',
      tooltip: 'First 5 GB/mo free (backed by Log Analytics workspace)',
    },
  ],
  getDefaultConfig: () => ({ ingestionGB: 20 }),
  calculateCost: (config, region): CostBreakdown => {
    const ingestionGB = (config.ingestionGB as number) || 0;
    const mul = getRegionMultiplier(region);

    const billableGB = Math.max(0, ingestionGB - APP_INSIGHTS_RATES.freeGrantGB);
    const cost = billableGB * APP_INSIGHTS_RATES.perGBIngestion * mul;

    return {
      lineItems: [{ label: `Ingestion (${ingestionGB} GB, 5 GB free)`, monthlyCost: cost }],
      totalMonthlyCost: cost,
    };
  },
};
