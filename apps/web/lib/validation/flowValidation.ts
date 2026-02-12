/**
 * Architectural Flow Validation Engine
 *
 * Validates that the architecture follows best practices for:
 * - Ingress/egress flow patterns
 * - Security isolation
 * - Connectivity completeness
 * - Service dependencies
 */

import type { AzureNode, AzureEdge, AzureServiceType } from '@/lib/state/types';

export interface FlowValidationFinding {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'flow' | 'security' | 'connectivity' | 'best-practice';
  title: string;
  description: string;
  affectedNodes?: string[]; // Node IDs
  recommendation: string;
}

export interface FlowValidationResult {
  findings: FlowValidationFinding[];
  score: number; // 0-100
  passed: boolean;
}

// Service types that should have ingress protection
const PUBLIC_FACING_SERVICES: AzureServiceType[] = [
  'app-service',
  'function-app',
  'static-web-app',
  'container-apps',
  'aks',
];

// Service types that should NEVER be directly public
const SENSITIVE_SERVICES: AzureServiceType[] = [
  'azure-sql',
  'cosmos-db',
  'storage-account',
  'redis-cache',
  'key-vault',
];

// Ingress protection services
const INGRESS_SERVICES: AzureServiceType[] = [
  'front-door',
  'application-gateway',
  'api-management',
];

/**
 * Run comprehensive flow validation on the architecture
 */
export function runFlowValidation(
  nodes: AzureNode[],
  edges: AzureEdge[]
): FlowValidationResult {
  const findings: FlowValidationFinding[] = [];

  // Filter out group nodes
  const serviceNodes = nodes.filter(n => n.type !== 'group');

  // Rule 1: Check for orphaned nodes (no connections)
  findings.push(...validateConnectivity(serviceNodes, edges));

  // Rule 2: Check ingress flow (public-facing services should have protection)
  findings.push(...validateIngressFlow(serviceNodes, edges));

  // Rule 3: Check that sensitive services are not directly exposed
  findings.push(...validateSensitiveServiceIsolation(serviceNodes, edges));

  // Rule 4: Check for proper network isolation
  findings.push(...validateNetworkIsolation(serviceNodes, nodes));

  // Rule 5: Check service dependency patterns
  findings.push(...validateServiceDependencies(serviceNodes, edges));

  // Rule 6: Check for proper authentication services
  findings.push(...validateAuthenticationFlow(serviceNodes, edges));

  // Calculate score
  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const warningCount = findings.filter(f => f.severity === 'warning').length;
  const score = Math.max(0, 100 - (criticalCount * 20) - (warningCount * 5));
  const passed = criticalCount === 0 && warningCount <= 2;

  return { findings, score, passed };
}

/**
 * Rule 1: Validate all services are connected
 */
function validateConnectivity(
  services: AzureNode[],
  edges: AzureEdge[]
): FlowValidationFinding[] {
  const findings: FlowValidationFinding[] = [];
  const connectedNodes = new Set<string>();

  edges.forEach(edge => {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  });

  const orphanedNodes = services.filter(n => !connectedNodes.has(n.id));

  if (orphanedNodes.length > 0) {
    findings.push({
      id: 'orphaned-services',
      severity: 'warning',
      category: 'connectivity',
      title: 'Orphaned Services Detected',
      description: `${orphanedNodes.length} service(s) have no connections: ${orphanedNodes.map(n => n.data.displayName).join(', ')}`,
      affectedNodes: orphanedNodes.map(n => n.id),
      recommendation: 'Connect these services to the architecture or remove them if not needed.',
    });
  }

  return findings;
}

/**
 * Rule 2: Validate ingress flow patterns
 */
function validateIngressFlow(
  services: AzureNode[],
  edges: AzureEdge[]
): FlowValidationFinding[] {
  const findings: FlowValidationFinding[] = [];

  const hasIngressService = services.some(n =>
    INGRESS_SERVICES.includes(n.data.serviceType)
  );

  const publicFacingServices = services.filter(n =>
    PUBLIC_FACING_SERVICES.includes(n.data.serviceType)
  );

  if (publicFacingServices.length > 0 && !hasIngressService) {
    findings.push({
      id: 'missing-ingress-protection',
      severity: 'critical',
      category: 'security',
      title: 'Missing Ingress Protection',
      description: `Architecture has public-facing services (${publicFacingServices.map(n => n.data.displayName).join(', ')}) but no ingress protection (Front Door, App Gateway, or API Management).`,
      affectedNodes: publicFacingServices.map(n => n.id),
      recommendation: 'Add Front Door or Application Gateway to protect public-facing services and provide WAF, SSL termination, and global load balancing.',
    });
  }

  // Check if public-facing services are connected to ingress
  if (hasIngressService && publicFacingServices.length > 0) {
    const ingressNodes = services.filter(n => INGRESS_SERVICES.includes(n.data.serviceType));
    const ingressNodeIds = new Set(ingressNodes.map(n => n.id));

    publicFacingServices.forEach(service => {
      const hasIngressConnection = edges.some(e =>
        ingressNodeIds.has(e.source) && e.target === service.id
      );

      if (!hasIngressConnection) {
        findings.push({
          id: `no-ingress-${service.id}`,
          severity: 'warning',
          category: 'flow',
          title: 'Service Not Behind Ingress',
          description: `${service.data.displayName} is not connected to an ingress service (Front Door/App Gateway).`,
          affectedNodes: [service.id],
          recommendation: 'Route traffic through the ingress layer for security and performance.',
        });
      }
    });
  }

  return findings;
}

/**
 * Rule 3: Validate sensitive services are not exposed
 */
function validateSensitiveServiceIsolation(
  services: AzureNode[],
  edges: AzureEdge[]
): FlowValidationFinding[] {
  const findings: FlowValidationFinding[] = [];

  const sensitiveServices = services.filter(n =>
    SENSITIVE_SERVICES.includes(n.data.serviceType)
  );

  sensitiveServices.forEach(service => {
    // Check if service has public connections
    const hasPublicConnection = edges.some(e =>
      (e.source === service.id || e.target === service.id) &&
      e.data?.connectionType === 'public'
    );

    if (hasPublicConnection) {
      findings.push({
        id: `exposed-${service.id}`,
        severity: 'critical',
        category: 'security',
        title: 'Sensitive Service Exposed',
        description: `${service.data.displayName} (${service.data.serviceType}) is using public connection instead of private endpoint.`,
        affectedNodes: [service.id],
        recommendation: 'Use private-endpoint connection type for databases, storage, and key vaults to keep them isolated from the public internet.',
      });
    }
  });

  return findings;
}

/**
 * Rule 4: Validate network isolation
 */
function validateNetworkIsolation(
  services: AzureNode[],
  allNodes: AzureNode[]
): FlowValidationFinding[] {
  const findings: FlowValidationFinding[] = [];

  const hasVNet = allNodes.some(n =>
    n.type === 'group' && n.data.groupType === 'virtual-network'
  );

  const computeServices = services.filter(n =>
    n.data.category === 'compute' || n.data.category === 'containers'
  );

  if (computeServices.length > 0 && !hasVNet) {
    findings.push({
      id: 'missing-vnet',
      severity: 'warning',
      category: 'best-practice',
      title: 'Missing Virtual Network',
      description: 'Architecture has compute services but no Virtual Network for network isolation.',
      recommendation: 'Use Virtual Networks to isolate resources and control traffic flow.',
    });
  }

  // Check if services are properly grouped in subnets
  const servicesInVNet = services.filter(n => {
    const parent = allNodes.find(g => g.id === n.parentId);
    return parent && (parent.data.groupType === 'virtual-network' || parent.data.groupType === 'subnet');
  });

  if (hasVNet && servicesInVNet.length < computeServices.length) {
    const notInVNet = computeServices.filter(s => !servicesInVNet.some(v => v.id === s.id));
    findings.push({
      id: 'services-outside-vnet',
      severity: 'warning',
      category: 'best-practice',
      title: 'Services Not in Virtual Network',
      description: `${notInVNet.length} compute service(s) are not placed in the Virtual Network: ${notInVNet.map(n => n.data.displayName).join(', ')}`,
      affectedNodes: notInVNet.map(n => n.id),
      recommendation: 'Place compute services in subnets within the VNet for proper network isolation.',
    });
  }

  return findings;
}

/**
 * Rule 5: Validate service dependency patterns
 */
function validateServiceDependencies(
  services: AzureNode[],
  edges: AzureEdge[]
): FlowValidationFinding[] {
  const findings: FlowValidationFinding[] = [];

  // Check: Databases should be accessed by compute, not directly exposed
  const databases = services.filter(n =>
    n.data.category === 'databases'
  );

  const compute = services.filter(n =>
    n.data.category === 'compute' || n.data.category === 'containers'
  );

  databases.forEach(db => {
    const hasComputeConnection = edges.some(e =>
      compute.some(c => c.id === e.source) && e.target === db.id
    );

    if (!hasComputeConnection && compute.length > 0) {
      findings.push({
        id: `unused-database-${db.id}`,
        severity: 'warning',
        category: 'flow',
        title: 'Database Not Connected to Compute',
        description: `${db.data.displayName} is not connected to any compute services.`,
        affectedNodes: [db.id],
        recommendation: 'Connect databases to compute services that will use them.',
      });
    }
  });

  return findings;
}

/**
 * Rule 6: Validate authentication flow
 */
function validateAuthenticationFlow(
  services: AzureNode[],
  edges: AzureEdge[]
): FlowValidationFinding[] {
  const findings: FlowValidationFinding[] = [];

  const hasEntraId = services.some(n => n.data.serviceType === 'entra-id');
  const hasPublicFacing = services.some(n =>
    PUBLIC_FACING_SERVICES.includes(n.data.serviceType)
  );

  if (hasPublicFacing && !hasEntraId) {
    findings.push({
      id: 'missing-auth',
      severity: 'info',
      category: 'best-practice',
      title: 'No Identity Service',
      description: 'Architecture has public-facing services but no Entra ID for authentication.',
      recommendation: 'Consider adding Entra ID (Azure AD) for user authentication and authorization.',
    });
  }

  return findings;
}
