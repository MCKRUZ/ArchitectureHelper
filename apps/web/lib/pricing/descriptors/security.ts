import type { ServicePricingDescriptor, CostBreakdown } from '../types';
import { KEY_VAULT_RATES, DDOS_RATES, getRegionMultiplier } from '../rates';

// ─── Key Vault ────────────────────────────────────────────────────────────────

export const keyVaultDescriptor: ServicePricingDescriptor = {
  serviceType: 'key-vault',
  label: 'Azure Key Vault',
  fields: [
    {
      key: 'tier',
      label: 'Tier',
      type: 'select',
      options: [
        { value: 'standard', label: 'Standard (software keys)' },
        { value: 'premium', label: 'Premium (HSM-backed keys)' },
      ],
    },
    {
      key: 'operations10K',
      label: 'Operations (10K / month)',
      type: 'number',
      min: 0,
      max: 10_000,
      step: 10,
      unit: 'x10K',
    },
    {
      key: 'certificates',
      label: 'Certificate Renewals',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      unit: 'renewals/mo',
    },
    {
      key: 'hsmKeys',
      label: 'HSM-Protected Keys',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      unit: 'keys',
      dependsOn: { field: 'tier', value: 'premium' },
    },
  ],
  getDefaultConfig: () => ({
    tier: 'standard',
    operations10K: 100,
    certificates: 0,
    hsmKeys: 0,
  }),
  calculateCost: (config, region): CostBreakdown => {
    const tier = config.tier as string;
    const ops10K = (config.operations10K as number) || 0;
    const certs = (config.certificates as number) || 0;
    const hsmKeys = (config.hsmKeys as number) || 0;
    const mul = getRegionMultiplier(region);

    const rates = tier === 'premium' ? KEY_VAULT_RATES.premium : KEY_VAULT_RATES.standard;
    const opsCost = ops10K * rates.per10KOps * mul;
    const certCost = certs * rates.perCertRenewal * mul;
    const hsmCost = tier === 'premium' ? hsmKeys * KEY_VAULT_RATES.premium.perHSMKey * mul : 0;

    const items = [
      { label: `Operations (${ops10K}x10K)`, monthlyCost: opsCost },
    ];
    if (certCost > 0) items.push({ label: `Certificates (${certs})`, monthlyCost: certCost });
    if (hsmCost > 0) items.push({ label: `HSM Keys (${hsmKeys})`, monthlyCost: hsmCost });

    return {
      lineItems: items,
      totalMonthlyCost: opsCost + certCost + hsmCost,
    };
  },
};

// ─── DDoS Protection ──────────────────────────────────────────────────────────

export const ddosProtectionDescriptor: ServicePricingDescriptor = {
  serviceType: 'ddos-protection',
  label: 'DDoS Protection',
  fields: [
    {
      key: 'tier',
      label: 'Plan',
      type: 'select',
      options: [
        { value: 'ip-protection', label: 'IP Protection ($199/IP/mo)' },
        { value: 'network-protection', label: 'Network Protection ($2,944/mo)' },
      ],
    },
    {
      key: 'protectedIPs',
      label: 'Protected Public IPs',
      type: 'number',
      min: 1,
      max: 100,
      step: 1,
      unit: 'IPs',
      dependsOn: { field: 'tier', value: 'ip-protection' },
    },
  ],
  getDefaultConfig: () => ({ tier: 'network-protection', protectedIPs: 1 }),
  calculateCost: (config, region): CostBreakdown => {
    const tier = config.tier as string;
    const mul = getRegionMultiplier(region);

    if (tier === 'ip-protection') {
      const ips = (config.protectedIPs as number) || 1;
      const cost = ips * DDOS_RATES['ip-protection'] * mul;
      return {
        lineItems: [{ label: `IP Protection (${ips} IPs)`, monthlyCost: cost }],
        totalMonthlyCost: cost,
      };
    }

    const cost = DDOS_RATES['network-protection'] * mul;
    return {
      lineItems: [{ label: 'Network Protection (flat)', monthlyCost: cost }],
      totalMonthlyCost: cost,
    };
  },
};
