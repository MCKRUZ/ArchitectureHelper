/**
 * Deep WAF Review
 *
 * On-demand, deeper analysis of architecture diagrams beyond the 15-rule instant WAF.
 * Covers observability, compliance, cost optimization, and resilience patterns
 * informed by Azure Skills knowledge.
 *
 * Runs asynchronously — triggered by user clicking "Deep Review" button.
 * Does NOT run during generation (instant WAF handles that).
 */

import type { AzureNode, AzureEdge, ArchReviewFinding } from '@/lib/state/types';
import {
  computeServiceSet,
  dataServiceSet,
  observabilityServiceSet,
  privateEndpointServiceSet,
  globalServiceSet,
} from '@/lib/azure/serviceClassification';

/**
 * Run a deep WAF review on the architecture.
 * Takes the shallow (instant) results to avoid duplicating findings.
 */
export async function runDeepWafReview(
  nodes: AzureNode[],
  edges: AzureEdge[],
  shallowResults: ArchReviewFinding[]
): Promise<ArchReviewFinding[]> {
  const findings: ArchReviewFinding[] = [];
  const services = nodes.filter(n => n.type !== 'group');
  const groups = nodes.filter(n => n.type === 'group');
  const serviceTypes = new Set(services.map(n => n.data.serviceType));

  // Track existing shallow finding titles to avoid duplicates
  const existingTitles = new Set(shallowResults.map(f => f.title));
  const addFinding = (finding: ArchReviewFinding) => {
    if (!existingTitles.has(finding.title)) {
      findings.push(finding);
    }
  };

  // ─── Observability Rules (azure-observability) ─────────────────────────────

  // Deep-1: Diagnostic settings coverage
  const servicesWithoutDiagnostics = services.filter(n => {
    if (observabilityServiceSet.has(n.data.serviceType)) return false;
    if (globalServiceSet.has(n.data.serviceType) && n.data.serviceType !== 'front-door') return false;
    const desc = (n.data.description ?? '').toLowerCase();
    return !desc.includes('diagnostic') && !desc.includes('monitoring') && !desc.includes('log analytics');
  });

  if (servicesWithoutDiagnostics.length > 0 && serviceTypes.has('log-analytics')) {
    servicesWithoutDiagnostics.forEach(n => {
      addFinding({
        pillar: 'operational-excellence',
        severity: 'info',
        nodeId: n.id,
        title: `No diagnostic settings mentioned for ${n.data.displayName}`,
        description: `${n.data.displayName} description doesn't mention diagnostic settings or Log Analytics integration.`,
        recommendation: 'Enable diagnostic settings to send platform logs and metrics to the Log Analytics workspace.',
      });
    });
  }

  // Deep-2: Missing alert rules
  if (services.length > 5) {
    const hasAlertMentioned = services.some(n => {
      const desc = (n.data.description ?? '').toLowerCase();
      return desc.includes('alert') || desc.includes('smart detection') || desc.includes('action group');
    });
    if (!hasAlertMentioned) {
      addFinding({
        pillar: 'operational-excellence',
        severity: 'warning',
        nodeId: '',
        title: 'No alert rules configured',
        description: 'No service descriptions mention alerting, smart detection, or action groups. Production architectures need proactive alerting.',
        recommendation: 'Configure Azure Monitor alert rules for critical metrics (CPU, memory, error rates, latency). Add Action Groups for notification routing.',
      });
    }
  }

  // Deep-3: Missing availability tests
  if (serviceTypes.has('application-insights')) {
    const appInsights = services.find(n => n.data.serviceType === 'application-insights');
    const desc = (appInsights?.data.description ?? '').toLowerCase();
    if (!desc.includes('availability') && !desc.includes('ping test') && !desc.includes('url test')) {
      addFinding({
        pillar: 'reliability',
        severity: 'info',
        nodeId: appInsights?.id ?? '',
        title: 'No availability tests configured',
        description: 'Application Insights is present but no availability/ping tests are mentioned for endpoint monitoring.',
        recommendation: 'Configure multi-location availability tests to detect outages from the user perspective.',
      });
    }
  }

  // ─── Compliance Rules (azure-compliance) ───────────────────────────────────

  // Deep-4: Encryption at rest verification
  const dataServicesInDiagram = services.filter(n => dataServiceSet.has(n.data.serviceType));
  dataServicesInDiagram.forEach(n => {
    const desc = (n.data.description ?? '').toLowerCase();
    if (!desc.includes('encrypt') && !desc.includes('tde') && !desc.includes('sse') && !desc.includes('cmk')) {
      addFinding({
        pillar: 'security',
        severity: 'info',
        nodeId: n.id,
        title: `Encryption at rest not mentioned for ${n.data.displayName}`,
        description: `${n.data.displayName} description doesn't explicitly mention encryption at rest (TDE, SSE, or CMK).`,
        recommendation: 'Verify encryption at rest is enabled. For sensitive data, consider customer-managed keys (CMK) via Key Vault.',
      });
    }
  });

  // Deep-5: Private DNS zones for private endpoints
  const privateEndpointEdges = edges.filter(e => e.data?.connectionType === 'private-endpoint');
  if (privateEndpointEdges.length > 3) {
    const anyMentionsDns = services.some(n => {
      const desc = (n.data.description ?? '').toLowerCase();
      return desc.includes('private dns') || desc.includes('dns zone');
    });
    if (!anyMentionsDns) {
      addFinding({
        pillar: 'security',
        severity: 'info',
        nodeId: '',
        title: 'Private DNS zones not mentioned',
        description: `${privateEndpointEdges.length} private endpoint connections exist but no Private DNS Zone configuration is mentioned. Private endpoints require DNS resolution to work correctly.`,
        recommendation: 'Configure Azure Private DNS Zones for each service type using private endpoints (e.g., privatelink.database.windows.net for SQL).',
      });
    }
  }

  // Deep-6: Azure Policy not mentioned
  if (services.length > 8) {
    const anyMentionsPolicy = services.some(n => {
      const desc = (n.data.description ?? '').toLowerCase();
      return desc.includes('azure policy') || desc.includes('policy assignment') || desc.includes('governance');
    });
    if (!anyMentionsPolicy) {
      addFinding({
        pillar: 'security',
        severity: 'info',
        nodeId: '',
        title: 'No Azure Policy governance',
        description: 'No service mentions Azure Policy for governance enforcement. Production environments should use policy to enforce standards.',
        recommendation: 'Apply Azure Policy initiatives for allowed regions, required tags, encryption requirements, and network restrictions.',
      });
    }
  }

  // ─── Cost Optimization Rules (azure-cost-optimization) ─────────────────────

  // Deep-7: Autoscale configuration
  const computeServices = services.filter(n => computeServiceSet.has(n.data.serviceType));
  computeServices.forEach(n => {
    const desc = (n.data.description ?? '').toLowerCase();
    if (!desc.includes('autoscal') && !desc.includes('auto-scale') && !desc.includes('scale') && !desc.includes('keda')) {
      addFinding({
        pillar: 'cost',
        severity: 'info',
        nodeId: n.id,
        title: `No autoscale mentioned for ${n.data.displayName}`,
        description: `${n.data.displayName} doesn't mention autoscaling configuration. Fixed instance counts may lead to over-provisioning.`,
        recommendation: 'Configure autoscale rules based on CPU, memory, or request metrics to optimize cost during low-traffic periods.',
      });
    }
  });

  // Deep-8: Reserved Instance / Savings Plan eligibility
  const premiumCompute = computeServices.filter(n => {
    const desc = (n.data.description ?? '').toLowerCase();
    const cost = n.data.monthlyCost ?? 0;
    return cost > 100 && !desc.includes('reserved') && !desc.includes('savings plan') && !desc.includes('consumption');
  });

  if (premiumCompute.length > 0) {
    addFinding({
      pillar: 'cost',
      severity: 'info',
      nodeId: '',
      title: 'Reserved Instance / Savings Plan opportunity',
      description: `${premiumCompute.length} compute service(s) with >$100/mo cost don't mention Reserved Instances or Savings Plans. For steady-state workloads, 1-year reservations save 30-40%.`,
      recommendation: 'Evaluate Azure Savings Plans or Reserved Instances for predictable compute workloads. Start with 1-year terms for new deployments.',
    });
  }

  // Deep-9: Over-provisioned SKUs
  services.forEach(n => {
    const desc = (n.data.description ?? '').toLowerCase();
    if (n.data.serviceType === 'ddos-protection' && (n.data.monthlyCost ?? 0) > 2500) {
      addFinding({
        pillar: 'cost',
        severity: 'warning',
        nodeId: n.id,
        title: 'DDoS Protection cost — consider IP Protection',
        description: `DDoS Network Protection costs ~$2,944/mo. For architectures with fewer than 15 public IPs, DDoS IP Protection ($199/IP/mo) may be more cost-effective.`,
        recommendation: 'Evaluate DDoS IP Protection vs. Network Protection based on your number of public IP addresses.',
      });
    }
    if (n.data.serviceType === 'service-bus' && desc.includes('premium') && (n.data.monthlyCost ?? 0) > 500) {
      const connectedEdges = edges.filter(e => e.source === n.id || e.target === n.id);
      if (connectedEdges.length <= 3) {
        addFinding({
          pillar: 'cost',
          severity: 'info',
          nodeId: n.id,
          title: `Premium Service Bus may be over-provisioned`,
          description: `${n.data.displayName} uses Premium tier (~$670/mo) but only has ${connectedEdges.length} connections. Standard tier may suffice if VNet integration isn't required.`,
          recommendation: 'Evaluate if Standard tier Service Bus meets throughput and feature requirements. Premium is needed only for VNet integration, large messages, or guaranteed throughput.',
        });
      }
    }
  });

  // ─── Resilience Rules (azure-diagnostics) ──────────────────────────────────

  // Deep-10: Health probes
  const webFacingCompute = computeServices.filter(n => {
    return edges.some(e => {
      const sourceNode = services.find(s => s.id === e.source);
      return e.target === n.id && sourceNode && (
        sourceNode.data.serviceType === 'front-door' ||
        sourceNode.data.serviceType === 'application-gateway' ||
        sourceNode.data.serviceType === 'load-balancer' ||
        sourceNode.data.serviceType === 'api-management'
      );
    });
  });

  webFacingCompute.forEach(n => {
    const desc = (n.data.description ?? '').toLowerCase();
    if (!desc.includes('health probe') && !desc.includes('health check') && !desc.includes('/health')) {
      addFinding({
        pillar: 'reliability',
        severity: 'info',
        nodeId: n.id,
        title: `No health probes for ${n.data.displayName}`,
        description: `${n.data.displayName} receives traffic from a load balancer/gateway but doesn't mention health probe configuration.`,
        recommendation: 'Configure health probes (e.g., /health endpoint) for proper load balancer health detection and automatic failover.',
      });
    }
  });

  // Deep-11: Retry policies
  const serviceToServiceEdges = edges.filter(e => {
    const source = services.find(s => s.id === e.source);
    const target = services.find(s => s.id === e.target);
    return source && target && computeServiceSet.has(source.data.serviceType);
  });

  if (serviceToServiceEdges.length > 5) {
    const anyMentionsRetry = services.some(n => {
      const desc = (n.data.description ?? '').toLowerCase();
      return desc.includes('retry') || desc.includes('circuit breaker') || desc.includes('polly') || desc.includes('resilience');
    });
    if (!anyMentionsRetry) {
      addFinding({
        pillar: 'reliability',
        severity: 'info',
        nodeId: '',
        title: 'No retry/resilience patterns mentioned',
        description: `${serviceToServiceEdges.length} service-to-service connections exist but no descriptions mention retry policies, circuit breakers, or resilience patterns.`,
        recommendation: 'Implement retry policies with exponential backoff and circuit breaker patterns for all service-to-service calls. Consider the Polly library for .NET or built-in SDK retry policies.',
      });
    }
  }

  // Deep-12: Zone redundancy check
  const criticalServices = services.filter(n => {
    const cost = n.data.monthlyCost ?? 0;
    return cost > 200 || computeServiceSet.has(n.data.serviceType) || dataServiceSet.has(n.data.serviceType);
  });

  criticalServices.forEach(n => {
    const desc = (n.data.description ?? '').toLowerCase();
    if (!desc.includes('zone') && !desc.includes('redundan') && !desc.includes('multi-region') && !desc.includes('failover')) {
      addFinding({
        pillar: 'reliability',
        severity: 'info',
        nodeId: n.id,
        title: `Zone redundancy not mentioned for ${n.data.displayName}`,
        description: `${n.data.displayName} is a critical service but doesn't mention zone redundancy, availability zones, or failover configuration.`,
        recommendation: 'Enable zone-redundant deployment for production workloads to survive single availability zone failures.',
      });
    }
  });

  // Deep-13: Backup strategy
  const dataNeedingBackup = services.filter(n =>
    dataServiceSet.has(n.data.serviceType) && n.data.serviceType !== 'redis-cache'
  );
  dataNeedingBackup.forEach(n => {
    const desc = (n.data.description ?? '').toLowerCase();
    if (!desc.includes('backup') && !desc.includes('point-in-time') && !desc.includes('geo-') && !desc.includes('restore')) {
      addFinding({
        pillar: 'reliability',
        severity: 'info',
        nodeId: n.id,
        title: `No backup strategy for ${n.data.displayName}`,
        description: `${n.data.displayName} doesn't mention backup, point-in-time restore, or geo-replication.`,
        recommendation: 'Configure automated backups with appropriate retention. For databases, enable point-in-time restore and geo-backup.',
      });
    }
  });

  // Deep-14: Managed identity verification
  computeServices.forEach(n => {
    const desc = (n.data.description ?? '').toLowerCase();
    if (!desc.includes('managed identity') && !desc.includes('workload identity') && !desc.includes('service principal')) {
      addFinding({
        pillar: 'security',
        severity: 'warning',
        nodeId: n.id,
        title: `No managed identity for ${n.data.displayName}`,
        description: `${n.data.displayName} doesn't mention managed identity or workload identity for authentication. Connection strings and shared keys are security risks.`,
        recommendation: 'Enable system-assigned or user-assigned managed identity. Use it for all downstream service access instead of connection strings.',
      });
    }
  });

  // Deep-15: Network segmentation depth
  const subnets = groups.filter(g => g.data.groupType === 'subnet');
  if (services.length > 12 && subnets.length < 3) {
    addFinding({
      pillar: 'security',
      severity: 'info',
      nodeId: '',
      title: 'Limited network segmentation',
      description: `Architecture has ${services.length} services but only ${subnets.length} subnet(s). Consider additional segmentation for defense in depth.`,
      recommendation: 'Add dedicated subnets for different tiers: Gateway Subnet, App Subnet, Data Subnet, Integration Subnet. Apply NSGs per subnet.',
    });
  }

  return findings;
}
