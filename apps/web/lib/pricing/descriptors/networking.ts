import type { ServicePricingDescriptor, CostBreakdown } from '../types';
import {
  VNET_PEERING_RATES,
  APP_GATEWAY_RATES,
  LOAD_BALANCER_RATES,
  LOAD_BALANCER_RULE_RATES,
  FRONT_DOOR_RATES,
  getRegionMultiplier,
} from '../rates';

// ─── Virtual Network ──────────────────────────────────────────────────────────

export const virtualNetworkDescriptor: ServicePricingDescriptor = {
  serviceType: 'virtual-network',
  label: 'Virtual Network',
  fields: [
    {
      key: 'peeringGBPerMonth',
      label: 'VNet Peering Data Transfer',
      type: 'number',
      min: 0,
      max: 100_000,
      step: 100,
      unit: 'GB/mo',
      tooltip: 'VNet itself is free. Peering data transfer is charged.',
    },
  ],
  getDefaultConfig: () => ({ peeringGBPerMonth: 0 }),
  calculateCost: (config, region): CostBreakdown => {
    const gb = (config.peeringGBPerMonth as number) || 0;
    const mul = getRegionMultiplier(region);
    const cost = gb * (VNET_PEERING_RATES.perGBInbound + VNET_PEERING_RATES.perGBOutbound) * mul;

    if (gb === 0) {
      return { lineItems: [{ label: 'VNet (free)', monthlyCost: 0 }], totalMonthlyCost: 0 };
    }
    return {
      lineItems: [{ label: `Peering Transfer (${gb} GB)`, monthlyCost: cost }],
      totalMonthlyCost: cost,
    };
  },
};

// ─── Application Gateway ──────────────────────────────────────────────────────

export const applicationGatewayDescriptor: ServicePricingDescriptor = {
  serviceType: 'application-gateway',
  label: 'Application Gateway',
  fields: [
    {
      key: 'tier',
      label: 'Tier',
      type: 'select',
      options: [
        { value: 'standard-v2', label: 'Standard v2' },
        { value: 'waf-v2', label: 'WAF v2' },
      ],
    },
    {
      key: 'capacityUnits',
      label: 'Capacity Units',
      type: 'number',
      min: 1,
      max: 125,
      step: 1,
      unit: 'CUs',
      tooltip: 'Avg capacity units consumed',
    },
  ],
  getDefaultConfig: () => ({ tier: 'waf-v2', capacityUnits: 10 }),
  calculateCost: (config, region): CostBreakdown => {
    const tier = config.tier as string;
    const cus = (config.capacityUnits as number) || 10;
    const mul = getRegionMultiplier(region);
    const rates = APP_GATEWAY_RATES[tier] ?? APP_GATEWAY_RATES['waf-v2'];
    const fixedCost = rates.fixed * mul;
    const cuCost = cus * rates.perCU * 730 / 730 * mul; // perCU is monthly already in our table

    return {
      lineItems: [
        { label: `Fixed (${tier})`, monthlyCost: fixedCost },
        { label: `Capacity Units (${cus} CU)`, monthlyCost: cuCost * cus },
      ],
      totalMonthlyCost: fixedCost + cuCost * cus,
    };
  },
};

// ─── Load Balancer ────────────────────────────────────────────────────────────

export const loadBalancerDescriptor: ServicePricingDescriptor = {
  serviceType: 'load-balancer',
  label: 'Load Balancer',
  fields: [
    {
      key: 'tier',
      label: 'Tier',
      type: 'select',
      options: [
        { value: 'basic', label: 'Basic (free)' },
        { value: 'standard', label: 'Standard' },
      ],
    },
    {
      key: 'rules',
      label: 'Load-Balancing Rules',
      type: 'number',
      min: 1,
      max: 150,
      step: 1,
      unit: 'rules',
      dependsOn: { field: 'tier', value: 'standard' },
    },
    {
      key: 'dataProcessedGB',
      label: 'Data Processed',
      type: 'number',
      min: 0,
      max: 100_000,
      step: 100,
      unit: 'GB/mo',
      dependsOn: { field: 'tier', value: 'standard' },
    },
  ],
  getDefaultConfig: () => ({ tier: 'standard', rules: 5, dataProcessedGB: 500 }),
  calculateCost: (config, region): CostBreakdown => {
    const tier = config.tier as string;
    const mul = getRegionMultiplier(region);

    if (tier === 'basic') {
      return { lineItems: [{ label: 'Basic LB (free)', monthlyCost: 0 }], totalMonthlyCost: 0 };
    }

    const rules = (config.rules as number) || 5;
    const dataGB = (config.dataProcessedGB as number) || 0;
    const baseCost = LOAD_BALANCER_RATES.standard * mul;
    const extraRules = Math.max(0, rules - 5);
    const ruleCost = extraRules * LOAD_BALANCER_RULE_RATES.perRuleOver5 * mul;
    const dataCost = dataGB * LOAD_BALANCER_RULE_RATES.perGBDataProcessed * mul;

    return {
      lineItems: [
        { label: 'Standard LB (base)', monthlyCost: baseCost },
        ...(ruleCost > 0 ? [{ label: `Extra rules (${extraRules})`, monthlyCost: ruleCost }] : []),
        ...(dataCost > 0 ? [{ label: `Data processed (${dataGB} GB)`, monthlyCost: dataCost }] : []),
      ],
      totalMonthlyCost: baseCost + ruleCost + dataCost,
    };
  },
};

// ─── Front Door ───────────────────────────────────────────────────────────────

export const frontDoorDescriptor: ServicePricingDescriptor = {
  serviceType: 'front-door',
  label: 'Azure Front Door',
  fields: [
    {
      key: 'tier',
      label: 'Tier',
      type: 'select',
      options: [
        { value: 'standard', label: 'Standard' },
        { value: 'premium', label: 'Premium (includes WAF bot protection)' },
      ],
    },
  ],
  getDefaultConfig: () => ({ tier: 'standard' }),
  calculateCost: (config, region): CostBreakdown => {
    const tier = config.tier as string;
    const mul = getRegionMultiplier(region);
    const cost = (FRONT_DOOR_RATES[tier] ?? 335) * mul;
    return {
      lineItems: [{ label: `Front Door (${tier})`, monthlyCost: cost }],
      totalMonthlyCost: cost,
    };
  },
};
