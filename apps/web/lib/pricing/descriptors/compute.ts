import type { ServicePricingDescriptor, CostBreakdown } from '../types';
import {
  APP_SERVICE_RATES,
  FUNCTION_APP_RATES,
  VM_RATES,
  VM_OS_PREMIUM,
  CONTAINER_APPS_RATES,
  AKS_RATES,
  getRegionMultiplier,
} from '../rates';

// ─── App Service ──────────────────────────────────────────────────────────────

export const appServiceDescriptor: ServicePricingDescriptor = {
  serviceType: 'app-service',
  label: 'App Service',
  fields: [
    {
      key: 'os',
      label: 'Operating System',
      type: 'select',
      options: [
        { value: 'linux', label: 'Linux' },
        { value: 'windows', label: 'Windows' },
      ],
    },
    {
      key: 'tier',
      label: 'Plan / SKU',
      type: 'select',
      optionGroups: [
        {
          group: 'Free / Shared',
          options: [
            { value: 'free-f1', label: 'Free F1' },
            { value: 'shared-d1', label: 'Shared D1' },
          ],
        },
        {
          group: 'Basic',
          options: [
            { value: 'basic-b1', label: 'Basic B1 (1 core, 1.75 GB)' },
            { value: 'basic-b2', label: 'Basic B2 (2 core, 3.5 GB)' },
            { value: 'basic-b3', label: 'Basic B3 (4 core, 7 GB)' },
          ],
        },
        {
          group: 'Standard',
          options: [
            { value: 'standard-s1', label: 'Standard S1 (1 core, 1.75 GB)' },
            { value: 'standard-s2', label: 'Standard S2 (2 core, 3.5 GB)' },
            { value: 'standard-s3', label: 'Standard S3 (4 core, 7 GB)' },
          ],
        },
        {
          group: 'Premium v3',
          options: [
            { value: 'premium-p1v3', label: 'Premium P1v3 (2 core, 8 GB)' },
            { value: 'premium-p2v3', label: 'Premium P2v3 (4 core, 16 GB)' },
            { value: 'premium-p3v3', label: 'Premium P3v3 (8 core, 32 GB)' },
          ],
        },
        {
          group: 'Isolated v2',
          options: [
            { value: 'isolated-i1v2', label: 'Isolated I1v2 (2 core, 8 GB)' },
            { value: 'isolated-i2v2', label: 'Isolated I2v2 (4 core, 16 GB)' },
          ],
        },
      ],
    },
    {
      key: 'instances',
      label: 'Instance Count',
      type: 'number',
      min: 1,
      max: 30,
      step: 1,
      unit: 'instances',
    },
  ],
  getDefaultConfig: () => ({ os: 'linux', tier: 'standard-s1', instances: 1 }),
  calculateCost: (config, region): CostBreakdown => {
    const tier = config.tier as string;
    const os = config.os as string;
    const instances = (config.instances as number) || 1;
    const mul = getRegionMultiplier(region);
    const baseRate = APP_SERVICE_RATES[tier] ?? 73;
    const osPremium = os === 'windows' ? 1 + (VM_OS_PREMIUM.windows ?? 0) : 1;
    const perInstance = baseRate * osPremium * mul;
    const total = perInstance * instances;

    const lineItems = [{ label: `Compute (${tier} x ${instances})`, monthlyCost: total }];
    if (os === 'windows' && baseRate > 0) {
      lineItems[0].label += ' [Windows]';
    }
    return { lineItems, totalMonthlyCost: total };
  },
};

// ─── Function App ─────────────────────────────────────────────────────────────

export const functionAppDescriptor: ServicePricingDescriptor = {
  serviceType: 'function-app',
  label: 'Function App',
  fields: [
    {
      key: 'plan',
      label: 'Hosting Plan',
      type: 'select',
      options: [
        { value: 'consumption', label: 'Consumption (pay-per-execution)' },
        { value: 'premium-ep1', label: 'Premium EP1 (1 core, 3.5 GB)' },
        { value: 'premium-ep2', label: 'Premium EP2 (2 core, 7 GB)' },
        { value: 'premium-ep3', label: 'Premium EP3 (4 core, 14 GB)' },
      ],
    },
    {
      key: 'executionsPerMonth',
      label: 'Executions / month',
      type: 'number',
      min: 0,
      max: 1_000_000_000,
      step: 100_000,
      unit: 'executions',
      dependsOn: { field: 'plan', value: 'consumption' },
    },
    {
      key: 'avgDurationMs',
      label: 'Avg Duration',
      type: 'number',
      min: 1,
      max: 600_000,
      step: 100,
      unit: 'ms',
      dependsOn: { field: 'plan', value: 'consumption' },
    },
    {
      key: 'memoryMB',
      label: 'Memory Allocation',
      type: 'number',
      min: 128,
      max: 1536,
      step: 128,
      unit: 'MB',
      dependsOn: { field: 'plan', value: 'consumption' },
    },
    {
      key: 'instances',
      label: 'Instance Count',
      type: 'number',
      min: 1,
      max: 20,
      step: 1,
      unit: 'instances',
      dependsOn: { field: 'plan', value: ['premium-ep1', 'premium-ep2', 'premium-ep3'] },
    },
  ],
  getDefaultConfig: () => ({
    plan: 'consumption',
    executionsPerMonth: 1_000_000,
    avgDurationMs: 500,
    memoryMB: 256,
    instances: 1,
  }),
  calculateCost: (config, region): CostBreakdown => {
    const plan = config.plan as string;
    const mul = getRegionMultiplier(region);

    if (plan === 'consumption') {
      const execs = (config.executionsPerMonth as number) || 0;
      const durationMs = (config.avgDurationMs as number) || 500;
      const memMB = (config.memoryMB as number) || 256;
      const rates = FUNCTION_APP_RATES.consumption;

      const billableExecs = Math.max(0, execs - rates.freeGrantExecutions);
      const execCost = (billableExecs / 1_000_000) * rates.perMillionExecutions;

      const gbSec = (execs * (durationMs / 1000) * (memMB / 1024));
      const billableGBSec = Math.max(0, gbSec - rates.freeGrantGBSec);
      const gbSecCost = billableGBSec * rates.perGBSec;

      const total = (execCost + gbSecCost) * mul;
      return {
        lineItems: [
          { label: 'Executions', monthlyCost: execCost * mul },
          { label: 'GB-seconds', monthlyCost: gbSecCost * mul },
        ],
        totalMonthlyCost: total,
      };
    }

    const rate = FUNCTION_APP_RATES[plan as keyof typeof FUNCTION_APP_RATES];
    const baseRate = typeof rate === 'number' ? rate : 0;
    const instances = (config.instances as number) || 1;
    const total = baseRate * instances * mul;
    return {
      lineItems: [{ label: `Compute (${plan} x ${instances})`, monthlyCost: total }],
      totalMonthlyCost: total,
    };
  },
};

// ─── Virtual Machine ──────────────────────────────────────────────────────────

export const virtualMachineDescriptor: ServicePricingDescriptor = {
  serviceType: 'virtual-machine',
  label: 'Virtual Machine',
  fields: [
    {
      key: 'os',
      label: 'Operating System',
      type: 'select',
      options: [
        { value: 'linux', label: 'Linux' },
        { value: 'windows', label: 'Windows' },
      ],
    },
    {
      key: 'size',
      label: 'VM Size',
      type: 'select',
      optionGroups: [
        {
          group: 'Burstable (B-series)',
          options: [
            { value: 'b1s', label: 'B1s (1 vCPU, 1 GB)' },
            { value: 'b2s', label: 'B2s (2 vCPU, 4 GB)' },
            { value: 'b2ms', label: 'B2ms (2 vCPU, 8 GB)' },
          ],
        },
        {
          group: 'General Purpose (D-series v5)',
          options: [
            { value: 'd2s-v5', label: 'D2s v5 (2 vCPU, 8 GB)' },
            { value: 'd4s-v5', label: 'D4s v5 (4 vCPU, 16 GB)' },
            { value: 'd8s-v5', label: 'D8s v5 (8 vCPU, 32 GB)' },
          ],
        },
        {
          group: 'AMD (Das-series v5)',
          options: [
            { value: 'd2as-v5', label: 'D2as v5 (2 vCPU, 8 GB)' },
            { value: 'd4as-v5', label: 'D4as v5 (4 vCPU, 16 GB)' },
          ],
        },
        {
          group: 'Memory Optimized (E-series)',
          options: [
            { value: 'e2s-v5', label: 'E2s v5 (2 vCPU, 16 GB)' },
            { value: 'e4s-v5', label: 'E4s v5 (4 vCPU, 32 GB)' },
          ],
        },
        {
          group: 'Compute Optimized (F-series)',
          options: [
            { value: 'f2s-v2', label: 'F2s v2 (2 vCPU, 4 GB)' },
            { value: 'f4s-v2', label: 'F4s v2 (4 vCPU, 8 GB)' },
          ],
        },
      ],
    },
    {
      key: 'count',
      label: 'Number of VMs',
      type: 'number',
      min: 1,
      max: 100,
      step: 1,
      unit: 'VMs',
    },
  ],
  getDefaultConfig: () => ({ os: 'linux', size: 'd2s-v5', count: 1 }),
  calculateCost: (config, region): CostBreakdown => {
    const size = config.size as string;
    const os = config.os as string;
    const count = (config.count as number) || 1;
    const mul = getRegionMultiplier(region);
    const baseRate = VM_RATES[size] ?? 70;
    const osPremium = os === 'windows' ? 1 + (VM_OS_PREMIUM.windows ?? 0) : 1;
    const perVm = baseRate * osPremium * mul;
    const total = perVm * count;

    return {
      lineItems: [{ label: `VM (${size} x ${count})${os === 'windows' ? ' [Windows]' : ''}`, monthlyCost: total }],
      totalMonthlyCost: total,
    };
  },
};

// ─── Container Apps ───────────────────────────────────────────────────────────

export const containerAppsDescriptor: ServicePricingDescriptor = {
  serviceType: 'container-apps',
  label: 'Container Apps',
  fields: [
    {
      key: 'plan',
      label: 'Environment Type',
      type: 'select',
      options: [
        { value: 'consumption', label: 'Consumption (pay-per-use)' },
        { value: 'dedicated-d4', label: 'Dedicated D4 (4 vCPU, 16 GB)' },
        { value: 'dedicated-d8', label: 'Dedicated D8 (8 vCPU, 32 GB)' },
        { value: 'dedicated-d16', label: 'Dedicated D16 (16 vCPU, 64 GB)' },
      ],
    },
    {
      key: 'vcpuSeconds',
      label: 'Active vCPU-seconds / month',
      type: 'number',
      min: 0,
      max: 100_000_000,
      step: 100_000,
      unit: 'vCPU-sec',
      dependsOn: { field: 'plan', value: 'consumption' },
    },
    {
      key: 'gibSeconds',
      label: 'Active GiB-seconds / month',
      type: 'number',
      min: 0,
      max: 200_000_000,
      step: 100_000,
      unit: 'GiB-sec',
      dependsOn: { field: 'plan', value: 'consumption' },
    },
    {
      key: 'replicas',
      label: 'Replicas',
      type: 'number',
      min: 1,
      max: 30,
      step: 1,
      unit: 'replicas',
      dependsOn: { field: 'plan', value: ['dedicated-d4', 'dedicated-d8', 'dedicated-d16'] },
    },
  ],
  getDefaultConfig: () => ({
    plan: 'consumption',
    vcpuSeconds: 2_000_000,
    gibSeconds: 4_000_000,
    replicas: 1,
  }),
  calculateCost: (config, region): CostBreakdown => {
    const plan = config.plan as string;
    const mul = getRegionMultiplier(region);

    if (plan === 'consumption') {
      const rates = CONTAINER_APPS_RATES.consumption;
      const vcpuSec = (config.vcpuSeconds as number) || 0;
      const gibSec = (config.gibSeconds as number) || 0;

      const billableVcpu = Math.max(0, vcpuSec - rates.freeVcpuSec);
      const billableGib = Math.max(0, gibSec - rates.freeGiBSec);

      const vcpuCost = billableVcpu * rates.perVcpuSec * mul;
      const gibCost = billableGib * rates.perGiBSec * mul;

      return {
        lineItems: [
          { label: 'vCPU-seconds', monthlyCost: vcpuCost },
          { label: 'GiB-seconds', monthlyCost: gibCost },
        ],
        totalMonthlyCost: vcpuCost + gibCost,
      };
    }

    const rate = CONTAINER_APPS_RATES[plan as keyof typeof CONTAINER_APPS_RATES];
    const baseRate = typeof rate === 'number' ? rate : 0;
    const replicas = (config.replicas as number) || 1;
    const total = baseRate * replicas * mul;
    return {
      lineItems: [{ label: `Dedicated (${plan} x ${replicas})`, monthlyCost: total }],
      totalMonthlyCost: total,
    };
  },
};

// ─── AKS ──────────────────────────────────────────────────────────────────────

export const aksDescriptor: ServicePricingDescriptor = {
  serviceType: 'aks',
  label: 'Azure Kubernetes Service',
  fields: [
    {
      key: 'clusterTier',
      label: 'Cluster Management',
      type: 'select',
      options: [
        { value: 'free', label: 'Free' },
        { value: 'standard', label: 'Standard ($73/mo)' },
        { value: 'premium', label: 'Premium ($292/mo)' },
      ],
    },
    {
      key: 'nodeSize',
      label: 'Node VM Size',
      type: 'select',
      optionGroups: [
        {
          group: 'General Purpose',
          options: [
            { value: 'd2s-v5', label: 'D2s v5 (2 vCPU, 8 GB)' },
            { value: 'd4s-v5', label: 'D4s v5 (4 vCPU, 16 GB)' },
            { value: 'd8s-v5', label: 'D8s v5 (8 vCPU, 32 GB)' },
          ],
        },
        {
          group: 'Memory Optimized',
          options: [
            { value: 'e2s-v5', label: 'E2s v5 (2 vCPU, 16 GB)' },
            { value: 'e4s-v5', label: 'E4s v5 (4 vCPU, 32 GB)' },
          ],
        },
      ],
    },
    {
      key: 'nodeCount',
      label: 'Node Count',
      type: 'number',
      min: 1,
      max: 100,
      step: 1,
      unit: 'nodes',
    },
  ],
  getDefaultConfig: () => ({ clusterTier: 'standard', nodeSize: 'd4s-v5', nodeCount: 3 }),
  calculateCost: (config, region): CostBreakdown => {
    const clusterTier = config.clusterTier as string;
    const nodeSize = config.nodeSize as string;
    const nodeCount = (config.nodeCount as number) || 3;
    const mul = getRegionMultiplier(region);

    const mgmtCost = (AKS_RATES.clusterManagement[clusterTier as keyof typeof AKS_RATES.clusterManagement] ?? 0) * mul;
    const nodeRate = (AKS_RATES.nodeVm[nodeSize] ?? 140) * mul;
    const nodeCost = nodeRate * nodeCount;

    return {
      lineItems: [
        { label: `Cluster Management (${clusterTier})`, monthlyCost: mgmtCost },
        { label: `Nodes (${nodeSize} x ${nodeCount})`, monthlyCost: nodeCost },
      ],
      totalMonthlyCost: mgmtCost + nodeCost,
    };
  },
};
