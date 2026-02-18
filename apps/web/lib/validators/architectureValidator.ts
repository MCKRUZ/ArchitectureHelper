/**
 * Azure Architecture Validator
 *
 * Validates and auto-fixes architecture diagrams to follow Azure Well-Architected Framework best practices.
 * Runs after AI generation to ensure proper nesting, grouping, and service placement.
 */

import type { AzureNode, AzureServiceType, GroupType } from '@/lib/state/types';

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  fixes: ArchitectureFix[];
}

interface ArchitectureFix {
  nodeId: string;
  fixType: 'move-to-group' | 'remove-from-group' | 'create-missing-group' | 'delete-invalid-group';
  description: string;
  newParent?: string;
  newPosition?: { x: number; y: number };
}

/**
 * Azure Service Classification Rules
 */
const SERVICE_RULES = {
  // Services that should NEVER be in a VNet (global/regional services)
  globalServices: [
    'front-door',
    'entra-id',
    'ddos-protection',
    'log-analytics',
    'application-insights',
  ] as AzureServiceType[],

  // Compute services (should be in App Subnet)
  computeServices: [
    'app-service',
    'function-app',
    'container-apps',
    'aks',
    'virtual-machine',
  ] as AzureServiceType[],

  // Data services (should be in Data Subnet)
  dataServices: [
    'cosmos-db',
    'azure-sql',
    'redis-cache',
    'storage-account',
  ] as AzureServiceType[],

  // Networking/Gateway services (should be in App Subnet or dedicated Gateway Subnet)
  networkingServices: [
    'api-management',
    'application-gateway',
  ] as AzureServiceType[],

  // Security services (can be in App Subnet or dedicated Security Subnet)
  securityServices: [
    'key-vault',
  ] as AzureServiceType[],

  // AI/ML services (should be in AI Subnet or App Subnet)
  aiServices: [
    'azure-openai',
    'ai-search',
  ] as AzureServiceType[],

  // Integration/Messaging services (should be in App Subnet for connectivity)
  integrationServices: [
    'event-grid',
    'service-bus',
    'event-hub',
  ] as AzureServiceType[],

  // Web services (should be in App Subnet)
  webServices: [
    'static-web-app',
  ] as AzureServiceType[],
};

/**
 * Required group hierarchy for Azure architectures
 */
const REQUIRED_GROUPS = {
  resourceGroup: {
    type: 'resource-group' as GroupType,
    displayName: 'Resource Group',
    required: true,
    parent: null,
  },
  virtualNetwork: {
    type: 'virtual-network' as GroupType,
    displayName: 'VNet',
    required: true,
    parent: 'resource-group',
    subtitle: '10.0.0.0/16',
  },
  appSubnet: {
    type: 'subnet' as GroupType,
    displayName: 'App Subnet',
    required: true,
    parent: 'virtual-network',
    subtitle: '10.0.1.0/24',
  },
  dataSubnet: {
    type: 'subnet' as GroupType,
    displayName: 'Data Subnet',
    required: true,
    parent: 'virtual-network',
    subtitle: '10.0.2.0/24',
  },
};

/**
 * Determine which subnet a service should belong to
 */
function getTargetSubnet(serviceType: AzureServiceType): string | null {
  console.log(`[getTargetSubnet] Checking service type: ${serviceType}`);

  if (SERVICE_RULES.globalServices.includes(serviceType)) {
    console.log(`  → Global service, returns null`);
    return null; // Should not be in any subnet
  }

  if (SERVICE_RULES.dataServices.includes(serviceType)) {
    console.log(`  → Data service, returns 'data-subnet'`);
    return 'data-subnet';
  }

  if (SERVICE_RULES.computeServices.includes(serviceType) ||
      SERVICE_RULES.networkingServices.includes(serviceType) ||
      SERVICE_RULES.webServices.includes(serviceType) ||
      SERVICE_RULES.aiServices.includes(serviceType) ||
      SERVICE_RULES.integrationServices.includes(serviceType) ||
      SERVICE_RULES.securityServices.includes(serviceType)) {
    console.log(`  → Compute/Network/Web/AI/Integration/Security service, returns 'app-subnet'`);
    return 'app-subnet';
  }

  console.log(`  → Unknown service type, returns 'app-subnet' (fallback)`);
  return 'app-subnet'; // Default fallback
}

/**
 * Validate and auto-fix architecture
 */
export function validateAndFixArchitecture(nodes: AzureNode[]): {
  nodes: AzureNode[];
  result: ValidationResult;
} {
  const issues: string[] = [];
  const fixes: ArchitectureFix[] = [];

  // Step 1: Ensure required groups exist
  const groups = nodes.filter(n => n.type === 'group');
  const services = nodes.filter(n => n.type !== 'group');

  let resourceGroup = groups.find(g => g.data.groupType === 'resource-group');
  let vnet = groups.find(g => g.data.groupType === 'virtual-network');

  // Find App Subnet (matches: app, application, compute, web, api)
  let appSubnet = groups.find(g => {
    if (g.data.groupType !== 'subnet') return false;
    const name = g.data.displayName.toLowerCase();
    return name.includes('app') || name.includes('compute') || name.includes('web') || name.includes('api');
  });

  // Find Data Subnet (matches: data, database, storage, db, persistence)
  let dataSubnet = groups.find(g => {
    if (g.data.groupType !== 'subnet') return false;
    const name = g.data.displayName.toLowerCase();
    return name.includes('data') || name.includes('database') || name.includes('storage') || name.includes('db') || name.includes('persist');
  });

  console.log('[validator] Found subnets:', {
    appSubnet: appSubnet?.data.displayName,
    dataSubnet: dataSubnet?.data.displayName
  });

  // Create missing groups
  if (!resourceGroup) {
    issues.push('Missing Resource Group');
    resourceGroup = createGroup('rg-main', 'resource-group', 'Resource Group', null);
    nodes.push(resourceGroup);
  }

  if (!vnet) {
    issues.push('Missing Virtual Network');
    vnet = createGroup('vnet-main', 'virtual-network', 'VNet', resourceGroup.id, '10.0.0.0/16');
    nodes.push(vnet);
  }

  if (!appSubnet) {
    issues.push('Missing App Subnet');
    appSubnet = createGroup('subnet-app', 'subnet', 'App Subnet', vnet.id, '10.0.1.0/24');
    nodes.push(appSubnet);
  }

  if (!dataSubnet) {
    issues.push('Missing Data Subnet');
    dataSubnet = createGroup('subnet-data', 'subnet', 'Data Subnet', vnet.id, '10.0.2.0/24');
    nodes.push(dataSubnet);
  }

  // Step 2: Fix group hierarchy
  if (vnet && vnet.data.logicalParent !== resourceGroup.id) {
    issues.push(`VNet not inside Resource Group`);
    vnet.data.logicalParent = resourceGroup.id;
    fixes.push({
      nodeId: vnet.id,
      fixType: 'move-to-group',
      description: 'Moved VNet inside Resource Group',
      newParent: resourceGroup.id,
    });
  }

  if (appSubnet && appSubnet.data.logicalParent !== vnet.id) {
    issues.push(`App Subnet not inside VNet`);
    appSubnet.data.logicalParent = vnet.id;
    fixes.push({
      nodeId: appSubnet.id,
      fixType: 'move-to-group',
      description: 'Moved App Subnet inside VNet',
      newParent: vnet.id,
    });
  }

  if (dataSubnet && dataSubnet.data.logicalParent !== vnet.id) {
    issues.push(`Data Subnet not inside VNet`);
    dataSubnet.data.logicalParent = vnet.id;
    fixes.push({
      nodeId: dataSubnet.id,
      fixType: 'move-to-group',
      description: 'Moved Data Subnet inside VNet',
      newParent: vnet.id,
    });
  }

  // Step 3: Fix service placement
  console.log('[validator] Step 3: Fixing service placement for', services.length, 'services');
  services.forEach(service => {
    const targetSubnet = getTargetSubnet(service.data.serviceType);
    const currentParent = service.data.logicalParent;

    console.log(`[validator] Processing service: ${service.data.displayName} (${service.data.serviceType})`);
    console.log(`[validator]   targetSubnet=${targetSubnet}, currentParent=${currentParent}`);

    if (targetSubnet === null) {
      // Global service - should NOT be in any subnet
      if (currentParent && (currentParent === appSubnet?.id || currentParent === dataSubnet?.id)) {
        issues.push(`${service.data.displayName} (${service.data.serviceType}) should NOT be in a subnet (global service)`);
        service.data.logicalParent = resourceGroup.id; // Move to RG level
        console.log(`[validator]   → Moving global service to RG`);
        fixes.push({
          nodeId: service.id,
          fixType: 'remove-from-group',
          description: `Removed ${service.data.displayName} from subnet (global service)`,
          newParent: resourceGroup.id,
        });
      } else if (!currentParent) {
        // Assign to resource group if not assigned
        service.data.logicalParent = resourceGroup.id;
        console.log(`[validator]   → Assigning orphan global service to RG`);
      } else {
        console.log(`[validator]   → Already in RG, no change needed`);
      }
    } else {
      // Should be in a specific subnet
      const targetGroup = targetSubnet === 'app-subnet' ? appSubnet : dataSubnet;
      console.log(`[validator]   targetGroup=${targetGroup?.data.displayName} (${targetGroup?.id})`);

      if (currentParent !== targetGroup?.id) {
        issues.push(`${service.data.displayName} (${service.data.serviceType}) should be in ${targetGroup?.data.displayName}`);
        service.data.logicalParent = targetGroup?.id ?? null;
        console.log(`[validator]   → Moving to ${targetGroup?.data.displayName}`);
        fixes.push({
          nodeId: service.id,
          fixType: 'move-to-group',
          description: `Moved ${service.data.displayName} to ${targetGroup?.data.displayName}`,
          newParent: targetGroup?.id,
        });
      } else {
        console.log(`[validator]   → Already in correct subnet, no change needed`);
      }
    }
  });

  // Step 4: Ensure all services are at least in Resource Group
  services.forEach(service => {
    if (!service.data.logicalParent) {
      service.data.logicalParent = resourceGroup.id;
      fixes.push({
        nodeId: service.id,
        fixType: 'move-to-group',
        description: `Added ${service.data.displayName} to Resource Group`,
        newParent: resourceGroup.id,
      });
    }
  });

  return {
    nodes,
    result: {
      isValid: issues.length === 0,
      issues,
      fixes,
    },
  };
}

/**
 * Helper to create a group node
 */
function createGroup(
  id: string,
  groupType: GroupType,
  displayName: string,
  parentId: string | null,
  subtitle?: string
): AzureNode {
  return {
    id,
    type: 'group',
    position: { x: 0, y: 0 }, // Will be auto-calculated by layout
    data: {
      displayName,
      serviceType: 'resource-group' as AzureServiceType, // Placeholder
      groupType,
      subtitle,
      logicalParent: parentId ?? undefined,
      status: 'proposed' as const,
      properties: {
        width: 1200,
        height: 600,
      },
      category: 'networking' as const,
    },
  };
}

/**
 * Get a human-readable validation report
 */
export function getValidationReport(result: ValidationResult): string {
  if (result.isValid) {
    return '✅ Architecture is valid and follows Azure best practices.';
  }

  let report = '⚠️ Architecture validation found issues:\n\n';

  result.issues.forEach((issue, i) => {
    report += `${i + 1}. ${issue}\n`;
  });

  if (result.fixes.length > 0) {
    report += '\n🔧 Auto-fixes applied:\n\n';
    result.fixes.forEach((fix, i) => {
      report += `${i + 1}. ${fix.description}\n`;
    });
  }

  return report;
}
