import type { AzureNode, AzureEdge, ArchReviewFinding, CostSummary } from '@/lib/state/types';
import { COST_ESTIMATES } from './costEstimates';

interface WafReviewResult {
  findings: ArchReviewFinding[];
  costSummary: CostSummary;
}

/**
 * Run an automated Well-Architected Framework review on the current diagram.
 * Pure function — no side effects.
 */
export function runWafReview(nodes: AzureNode[], edges: AzureEdge[]): WafReviewResult {
  const findings: ArchReviewFinding[] = [];
  const services = nodes.filter(n => n.type !== 'group');
  const groups = nodes.filter(n => n.type === 'group');

  const serviceTypes = new Set(services.map(n => n.data.serviceType));
  const connectedNodeIds = new Set<string>();
  edges.forEach(e => {
    connectedNodeIds.add(e.source);
    connectedNodeIds.add(e.target);
  });

  const hasWebFacing = serviceTypes.has('front-door') || serviceTypes.has('application-gateway');

  // Rule 1: Orphan nodes (no connections)
  services.forEach(n => {
    if (!connectedNodeIds.has(n.id)) {
      findings.push({
        pillar: 'reliability',
        severity: 'critical',
        nodeId: n.id,
        title: 'Orphan service — no connections',
        description: `${n.data.displayName} has no connections to any other service.`,
        recommendation: 'Connect this service to at least one other service or remove it from the diagram.',
      });
    }
  });

  // Rule 2: Missing Application Insights
  if (!serviceTypes.has('application-insights') && services.length > 0) {
    findings.push({
      pillar: 'operational-excellence',
      severity: 'critical',
      nodeId: '',
      title: 'Missing Application Insights',
      description: 'No Application Insights found. This is the most critical observability gap — APM, distributed tracing, and live metrics are unavailable.',
      recommendation: 'Add Application Insights and connect it to all compute services via service-endpoint.',
    });
  }

  // Rule 3: Missing DDoS Protection when web-facing
  if (hasWebFacing && !serviceTypes.has('ddos-protection')) {
    findings.push({
      pillar: 'security',
      severity: 'warning',
      nodeId: '',
      title: 'Missing DDoS Protection',
      description: 'Web-facing architecture detected (Front Door or App Gateway) but no DDoS Protection plan.',
      recommendation: 'Add Azure DDoS Protection Standard to protect public-facing endpoints.',
    });
  }

  // Rule 4: Missing Key Vault
  if (!serviceTypes.has('key-vault') && services.length > 0) {
    findings.push({
      pillar: 'security',
      severity: 'critical',
      nodeId: '',
      title: 'Missing Key Vault',
      description: 'No Key Vault found. Secrets, certificates, and encryption keys have no centralized management.',
      recommendation: 'Add Azure Key Vault and connect all compute services via private-endpoint with managed identity.',
    });
  }

  // Rule 5: Compute not connected to Key Vault
  const computeTypes = new Set(['app-service', 'function-app', 'container-apps', 'aks', 'virtual-machine']);
  const keyVaultNodes = services.filter(n => n.data.serviceType === 'key-vault');
  if (keyVaultNodes.length > 0) {
    const kvIds = new Set(keyVaultNodes.map(n => n.id));
    services.forEach(n => {
      if (!computeTypes.has(n.data.serviceType)) return;
      const connectedToKv = edges.some(
        e => (e.source === n.id && kvIds.has(e.target)) || (e.target === n.id && kvIds.has(e.source))
      );
      if (!connectedToKv) {
        findings.push({
          pillar: 'security',
          severity: 'warning',
          nodeId: n.id,
          title: 'Compute not connected to Key Vault',
          description: `${n.data.displayName} is not connected to Key Vault for secrets management.`,
          recommendation: 'Add a private-endpoint connection from this compute service to Key Vault.',
        });
      }
    });
  }

  // Rule 6: Data services with public inbound
  const dataTypes = new Set(['azure-sql', 'cosmos-db', 'storage-account', 'redis-cache', 'azure-openai', 'ai-search']);
  services.forEach(n => {
    if (!dataTypes.has(n.data.serviceType)) return;
    const hasPublicInbound = edges.some(
      e => e.target === n.id && e.data?.connectionType === 'public'
    );
    if (hasPublicInbound) {
      findings.push({
        pillar: 'security',
        severity: 'warning',
        nodeId: n.id,
        title: 'Data service has public inbound connection',
        description: `${n.data.displayName} receives traffic over a public connection. Data services should use private endpoints.`,
        recommendation: 'Change the connection type to private-endpoint.',
      });
    }
  });

  // Rule 7: Flat VNet (no subnets)
  const vnets = groups.filter(n => n.data.groupType === 'virtual-network');
  const subnets = groups.filter(n => n.data.groupType === 'subnet');
  if (vnets.length > 0 && subnets.length === 0) {
    findings.push({
      pillar: 'security',
      severity: 'warning',
      nodeId: vnets[0].id,
      title: 'Flat VNet — no subnets',
      description: 'Virtual Network has no subnet segmentation. All services share the same network segment.',
      recommendation: 'Add at least 2 subnets (App Subnet, Data Subnet) for network segmentation and NSG isolation.',
    });
  }

  // Rule 8: Missing Log Analytics
  if (!serviceTypes.has('log-analytics') && services.length > 0) {
    findings.push({
      pillar: 'operational-excellence',
      severity: 'warning',
      nodeId: '',
      title: 'Missing Log Analytics',
      description: 'No Log Analytics workspace found. Platform logs, metrics, and security events have no central aggregation.',
      recommendation: 'Add a Log Analytics workspace and route all resource diagnostic settings to it.',
    });
  }

  // Rule 9: Missing Entra ID
  if (!serviceTypes.has('entra-id') && services.length > 0) {
    findings.push({
      pillar: 'security',
      severity: 'warning',
      nodeId: '',
      title: 'Missing Entra ID',
      description: 'No identity provider found. Authentication and RBAC are not represented in the architecture.',
      recommendation: 'Add Entra ID for user authentication, managed identities, and role-based access control.',
    });
  }

  // Rule 10: Database without Redis Cache
  const hasDatabase = serviceTypes.has('azure-sql') || serviceTypes.has('cosmos-db');
  if (hasDatabase && !serviceTypes.has('redis-cache')) {
    findings.push({
      pillar: 'performance',
      severity: 'warning',
      nodeId: '',
      title: 'Database without caching layer',
      description: 'Database services exist but no Redis Cache for response caching and session state.',
      recommendation: 'Add Redis Cache to reduce database load and improve response latency.',
    });
  }

  // Rule 11: No load balancer or entry point
  if (services.length > 5 && !hasWebFacing && !serviceTypes.has('load-balancer') && !serviceTypes.has('api-management')) {
    findings.push({
      pillar: 'reliability',
      severity: 'warning',
      nodeId: '',
      title: 'No load balancer or entry point',
      description: 'Architecture has 5+ services but no Front Door, App Gateway, Load Balancer, or API Management for traffic distribution.',
      recommendation: 'Add a load balancer or API gateway as the entry point for reliability and scalability.',
    });
  }

  // Rule 12: Compute not connected to Application Insights
  const appInsightsNodes = services.filter(n => n.data.serviceType === 'application-insights');
  if (appInsightsNodes.length > 0) {
    const aiIds = new Set(appInsightsNodes.map(n => n.id));
    services.forEach(n => {
      if (!computeTypes.has(n.data.serviceType)) return;
      const connectedToAI = edges.some(
        e => (e.source === n.id && aiIds.has(e.target)) || (e.target === n.id && aiIds.has(e.source))
      );
      if (!connectedToAI) {
        findings.push({
          pillar: 'operational-excellence',
          severity: 'info',
          nodeId: n.id,
          title: 'Compute not connected to Application Insights',
          description: `${n.data.displayName} is not connected to Application Insights for APM and distributed tracing.`,
          recommendation: 'Add a service-endpoint connection from Application Insights to this compute service.',
        });
      }
    });
  }

  // Rule 13: Missing service description
  services.forEach(n => {
    if (!n.data.description || n.data.description.trim().length < 10) {
      findings.push({
        pillar: 'operational-excellence',
        severity: 'info',
        nodeId: n.id,
        title: 'Missing service description',
        description: `${n.data.displayName} has no meaningful description explaining its role.`,
        recommendation: 'Add a description mentioning HA, security, SKU, cost, or scaling details.',
      });
    }
  });

  // Rule 14: No VNet with >5 services
  if (services.length > 5 && vnets.length === 0) {
    findings.push({
      pillar: 'security',
      severity: 'warning',
      nodeId: '',
      title: 'No Virtual Network',
      description: 'Architecture has 5+ services but no Virtual Network for network isolation.',
      recommendation: 'Add a VNet and place compute/data services inside it with appropriate subnets.',
    });
  }

  // Rule 15: Storage without lifecycle mention
  services.forEach(n => {
    if (n.data.serviceType !== 'storage-account') return;
    const desc = (n.data.description ?? '').toLowerCase();
    if (!desc.includes('lifecycle') && !desc.includes('tier') && !desc.includes('archive') && !desc.includes('cool')) {
      findings.push({
        pillar: 'cost',
        severity: 'info',
        nodeId: n.id,
        title: 'Storage without lifecycle management',
        description: `${n.data.displayName} description doesn't mention lifecycle policies for cost optimization.`,
        recommendation: 'Consider adding lifecycle management to auto-tier data to Cool/Archive storage.',
      });
    }
  });

  // Calculate cost summary
  const byService: Record<string, number> = {};
  const byResourceGroup: Record<string, number> = {};
  let totalMonthly = 0;

  services.forEach(n => {
    const cost = n.data.monthlyCost ?? COST_ESTIMATES[n.data.serviceType] ?? 0;
    byService[n.data.displayName] = cost;
    totalMonthly += cost;

    // Attribute cost to parent resource group
    if (n.parentId) {
      const parentGroup = groups.find(g => g.id === n.parentId);
      if (parentGroup) {
        const rgName = parentGroup.data.displayName;
        byResourceGroup[rgName] = (byResourceGroup[rgName] ?? 0) + cost;
      }
    }
  });

  // If services have no parent, attribute to a default group
  const unattributed = totalMonthly - Object.values(byResourceGroup).reduce((a, b) => a + b, 0);
  if (unattributed > 0) {
    byResourceGroup['Unattributed'] = unattributed;
  }

  const costSummary: CostSummary = {
    monthly: totalMonthly,
    byService,
    byResourceGroup,
  };

  return { findings, costSummary };
}
