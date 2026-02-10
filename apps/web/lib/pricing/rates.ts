/**
 * Azure Pricing Rate Tables
 *
 * Based on East US pay-as-you-go pricing (USD/month).
 * Region multipliers adjust for geographic differences.
 * These are approximate for architectural planning — not billing-accurate.
 */

// ─── Region Multipliers ───────────────────────────────────────────────────────

export const REGION_MULTIPLIERS: Record<string, number> = {
  eastus: 1.0,
  eastus2: 1.0,
  westus: 1.02,
  westus2: 1.0,
  centralus: 1.0,
  northeurope: 1.08,
  westeurope: 1.12,
  uksouth: 1.10,
  southeastasia: 1.06,
  australiaeast: 1.15,
};

export function getRegionMultiplier(region: string): number {
  return REGION_MULTIPLIERS[region] ?? 1.0;
}

// ─── App Service ──────────────────────────────────────────────────────────────

export const APP_SERVICE_RATES: Record<string, number> = {
  'free-f1': 0,
  'shared-d1': 9.49,
  'basic-b1': 54.75,
  'basic-b2': 109.50,
  'basic-b3': 219.00,
  'standard-s1': 73.00,
  'standard-s2': 146.00,
  'standard-s3': 292.00,
  'premium-p1v3': 138.70,
  'premium-p2v3': 277.40,
  'premium-p3v3': 554.80,
  'isolated-i1v2': 298.00,
  'isolated-i2v2': 596.00,
};

// ─── Function App ─────────────────────────────────────────────────────────────

export const FUNCTION_APP_RATES = {
  consumption: { perMillionExecutions: 0.20, perGBSec: 0.000016, freeGrantExecutions: 1_000_000, freeGrantGBSec: 400_000 },
  'premium-ep1': 150.74,
  'premium-ep2': 301.49,
  'premium-ep3': 602.98,
};

// ─── Virtual Machine ──────────────────────────────────────────────────────────

export const VM_RATES: Record<string, number> = {
  'b1s': 7.59,
  'b2s': 30.37,
  'b2ms': 60.74,
  'd2s-v5': 70.08,
  'd4s-v5': 140.16,
  'd8s-v5': 280.32,
  'd2as-v5': 62.05,
  'd4as-v5': 124.10,
  'e2s-v5': 91.98,
  'e4s-v5': 183.96,
  'f2s-v2': 61.32,
  'f4s-v2': 122.64,
};

export const VM_OS_PREMIUM: Record<string, number> = {
  linux: 0,
  windows: 0.08, // 8% premium over linux
};

// ─── Container Apps ───────────────────────────────────────────────────────────

export const CONTAINER_APPS_RATES = {
  consumption: { perVcpuSec: 0.000024, perGiBSec: 0.000003, freeVcpuSec: 180_000, freeGiBSec: 360_000 },
  'dedicated-d4': 215.35,
  'dedicated-d8': 430.70,
  'dedicated-d16': 861.40,
};

// ─── AKS ──────────────────────────────────────────────────────────────────────

export const AKS_RATES = {
  clusterManagement: { free: 0, standard: 73.00, premium: 292.00 },
  nodeVm: VM_RATES, // reuse VM rates for node pools
};

// ─── Azure SQL ────────────────────────────────────────────────────────────────

export const AZURE_SQL_DTU_RATES: Record<string, { base: number; perExtraStorage: number }> = {
  'basic-5dtu': { base: 4.99, perExtraStorage: 0.085 },
  'standard-10dtu': { base: 14.72, perExtraStorage: 0.085 },
  'standard-20dtu': { base: 29.44, perExtraStorage: 0.085 },
  'standard-50dtu': { base: 73.60, perExtraStorage: 0.085 },
  'standard-100dtu': { base: 147.20, perExtraStorage: 0.085 },
  'premium-125dtu': { base: 465.00, perExtraStorage: 0.25 },
  'premium-250dtu': { base: 930.00, perExtraStorage: 0.25 },
  'premium-500dtu': { base: 1860.00, perExtraStorage: 0.25 },
};

export const AZURE_SQL_VCORE_RATES: Record<string, { perVcore: number; perStorageGB: number }> = {
  'general-purpose': { perVcore: 120.67, perStorageGB: 0.115 },
  'business-critical': { perVcore: 349.63, perStorageGB: 0.25 },
  'hyperscale': { perVcore: 120.67, perStorageGB: 0.25 },
};

// ─── Cosmos DB ────────────────────────────────────────────────────────────────

export const COSMOS_DB_RATES = {
  provisioned: { per100RU: 5.84 },
  autoscale: { per100RU: 8.76 }, // 1.5x provisioned
  serverless: { perMillionRU: 0.25, perGBStorage: 0.25 },
};

// ─── Storage Account ──────────────────────────────────────────────────────────

export const STORAGE_RATES: Record<string, number> = {
  'hot-lrs': 0.018,
  'hot-zrs': 0.023,
  'hot-grs': 0.036,
  'hot-ragrs': 0.046,
  'cool-lrs': 0.010,
  'cool-zrs': 0.013,
  'cool-grs': 0.020,
  'archive-lrs': 0.00099,
  'archive-grs': 0.00198,
};

export const STORAGE_TRANSACTION_RATES: Record<string, number> = {
  hot: 0.0044,    // per 10K operations
  cool: 0.010,
  archive: 0.50,
};

// ─── Redis Cache ──────────────────────────────────────────────────────────────

export const REDIS_RATES: Record<string, number> = {
  'basic-c0': 16.37,
  'basic-c1': 40.15,
  'basic-c2': 62.05,
  'basic-c3': 124.10,
  'standard-c0': 40.15,
  'standard-c1': 80.30,
  'standard-c2': 155.13,
  'standard-c3': 310.25,
  'premium-p1': 225.04,
  'premium-p2': 449.33,
  'premium-p3': 914.71,
  'premium-p4': 1793.59,
};

// ─── Virtual Network ──────────────────────────────────────────────────────────

export const VNET_PEERING_RATES = {
  perGBInbound: 0.01,
  perGBOutbound: 0.01,
};

// ─── Application Gateway ──────────────────────────────────────────────────────

export const APP_GATEWAY_RATES: Record<string, { fixed: number; perCU: number }> = {
  'standard-v2': { fixed: 179.58, perCU: 5.84 },
  'waf-v2': { fixed: 262.80, perCU: 5.84 },
};

// ─── Load Balancer ────────────────────────────────────────────────────────────

export const LOAD_BALANCER_RATES: Record<string, number> = {
  basic: 0,
  standard: 18.25,
};

export const LOAD_BALANCER_RULE_RATES = {
  perRuleOver5: 7.30, // per rule beyond first 5
  perGBDataProcessed: 0.005,
};

// ─── Front Door ───────────────────────────────────────────────────────────────

export const FRONT_DOOR_RATES: Record<string, number> = {
  standard: 335.00,
  premium: 615.00,
};

// ─── Key Vault ────────────────────────────────────────────────────────────────

export const KEY_VAULT_RATES = {
  standard: { per10KOps: 0.03, perCertRenewal: 3.00 },
  premium: { per10KOps: 0.03, perHSMKey: 1.00, perCertRenewal: 3.00 },
};

// ─── DDoS Protection ──────────────────────────────────────────────────────────

export const DDOS_RATES: Record<string, number> = {
  'ip-protection': 199.00,     // per protected IP per month
  'network-protection': 2944.00, // flat + per resource
};

// ─── API Management ───────────────────────────────────────────────────────────

export const APIM_RATES: Record<string, number> = {
  consumption: 3.50, // per million calls
  developer: 48.36,
  basic: 151.13,
  standard: 677.08,
  premium: 2797.57,
};

// ─── Service Bus ──────────────────────────────────────────────────────────────

export const SERVICE_BUS_RATES: Record<string, number> = {
  basic: 0.05,      // per million operations
  standard: 9.81,   // base + per million
  premium: 668.86,  // per messaging unit
};

// ─── Event Hub ────────────────────────────────────────────────────────────────

export const EVENT_HUB_RATES: Record<string, number> = {
  basic: 10.95,      // per TU
  standard: 21.90,   // per TU
  premium: 87.60,    // per PU
  dedicated: 6570.00, // per CU
};

// ─── Event Grid ───────────────────────────────────────────────────────────────

export const EVENT_GRID_RATES = {
  perMillionOps: 0.60,
  freeGrant: 100_000, // first 100K ops free
};

// ─── Azure OpenAI ─────────────────────────────────────────────────────────────

export const AZURE_OPENAI_RATES: Record<string, { perMillionInput: number; perMillionOutput: number }> = {
  'gpt-4o': { perMillionInput: 2.50, perMillionOutput: 10.00 },
  'gpt-4o-mini': { perMillionInput: 0.15, perMillionOutput: 0.60 },
  'gpt-4-turbo': { perMillionInput: 10.00, perMillionOutput: 30.00 },
  'gpt-35-turbo': { perMillionInput: 0.50, perMillionOutput: 1.50 },
  'text-embedding-ada-002': { perMillionInput: 0.10, perMillionOutput: 0 },
  'text-embedding-3-small': { perMillionInput: 0.02, perMillionOutput: 0 },
};

// ─── AI Search ────────────────────────────────────────────────────────────────

export const AI_SEARCH_RATES: Record<string, number> = {
  free: 0,
  basic: 75.19,
  'standard-s1': 250.39,
  'standard-s2': 1001.56,
  'standard-s3': 2003.12,
};

// ─── Entra ID ─────────────────────────────────────────────────────────────────

export const ENTRA_ID_RATES: Record<string, number> = {
  free: 0,
  'p1': 6.00,  // per user/month
  'p2': 9.00,  // per user/month
};

// ─── Log Analytics ────────────────────────────────────────────────────────────

export const LOG_ANALYTICS_RATES = {
  perGBIngestion: 2.76,
  freeGrantGB: 5,
  retentionFreedays: 31,
  perGBRetentionExtraDays: 0.10, // per GB per extra 30 days
};

// ─── Application Insights ─────────────────────────────────────────────────────

export const APP_INSIGHTS_RATES = {
  perGBIngestion: 2.76, // same as Log Analytics (backed by LA workspace)
  freeGrantGB: 5,
};

// ─── Static Web App ───────────────────────────────────────────────────────────

export const STATIC_WEB_APP_RATES: Record<string, number> = {
  free: 0,
  standard: 9.00,
};
