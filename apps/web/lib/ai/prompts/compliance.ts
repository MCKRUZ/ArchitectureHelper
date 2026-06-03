/**
 * Compliance context — activated when user mentions regulatory requirements.
 * Informed by azure-compliance and azure-rbac skills.
 */

export const COMPLIANCE = `## Compliance Overlays

When the user mentions compliance, regulatory requirements, or industry standards, ADD the corresponding services and configurations to the architecture. These are ADDITIVE — they layer on top of the base architecture.

### HIPAA (Healthcare)
When user mentions: HIPAA, healthcare, PHI, patient data, medical records
ADD these requirements:
- **Network isolation**: All data services MUST use private endpoints + VNet integration. No public endpoints.
- **Encryption**: TDE on all databases, encryption at rest for all storage, TLS 1.2+ for all connections.
- **Audit logging**: Add \`log-analytics\` with 365-day retention. Enable diagnostic settings on EVERY resource.
- **Access control**: Entra ID with Conditional Access, PIM for admin access, RBAC with least privilege.
- **BAA**: Note in descriptions that BAA (Business Associate Agreement) is required with Microsoft.
- **Extra services**: Consider adding Azure Policy for compliance enforcement, Microsoft Defender for Cloud.
- **Data residency**: Specify region explicitly and note data sovereignty requirements.

### PCI-DSS (Payment Card Industry)
When user mentions: PCI, PCI-DSS, payment, credit card, cardholder data
ADD these requirements:
- **WAF**: \`application-gateway\` with WAF v2 policy is MANDATORY (not optional). OWASP 3.2 ruleset.
- **Network segmentation**: Dedicated "CDE Subnet" (Cardholder Data Environment) for payment services.
- **Key rotation**: Key Vault with automatic key rotation (90-day policy). HSM-backed keys for encryption.
- **Encryption**: TDE + Always Encrypted for cardholder data columns in SQL. Column-level encryption.
- **Monitoring**: Application Insights + Log Analytics with 1-year retention. Real-time alerting on anomalies.
- **Vulnerability scanning**: Note Microsoft Defender for Cloud requirement in descriptions.
- **No public data access**: ALL data services must be private endpoint only.

### SOC 2 (Service Organization Controls)
When user mentions: SOC 2, SOC2, audit, trust services, compliance certification
ADD these requirements:
- **RBAC**: Granular role assignments via Entra ID. Document all roles in service descriptions.
- **Change management**: Note deployment slots, blue/green deployments, and approval gates.
- **Monitoring**: Comprehensive monitoring stack — Application Insights, Log Analytics, Azure Monitor alerts.
- **Incident response**: Service Bus for alert routing, Function App for automated remediation.
- **Availability**: Zone-redundant deployments for all critical services. Document SLA targets.
- **Data classification**: Note data classification (public/internal/confidential/restricted) in storage descriptions.

### General Compliance Guidance
- Always mention specific compliance requirements in service descriptions.
- Include estimated compliance overhead in cost descriptions (e.g., "Premium SKU required for HIPAA compliance").
- Add Azure Policy as an architectural note when any compliance framework is mentioned.
- Reference Microsoft's compliance documentation URL in the architecture summary.`;
