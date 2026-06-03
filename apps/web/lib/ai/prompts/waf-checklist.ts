/**
 * Pre-generation self-check for the AI agent.
 * Must pass all checks before calling generateArchitecture.
 */

export const WAF_CHECKLIST = `## Pre-Generation Self-Check

SELF-CHECK (all 10 must pass before calling generateArchitecture):
- [ ] Every service has at least 1 connection?
- [ ] application-insights is present and connected to all compute services?
- [ ] ddos-protection is present when front-door or application-gateway exists?
- [ ] key-vault is connected to every compute service via private-endpoint?
- [ ] At least 2 subnets (App Subnet + Data Subnet) exist inside the VNet?
- [ ] Every description mentions at least 2 of: HA, security, SKU, cost, scaling?
- [ ] At least 12 services total?
- [ ] Connection count >= 1.5x service count?
- [ ] All compute-to-data connections use managed identity + private endpoint (no connection strings)?
- [ ] Service selection follows decision trees (not always defaulting to app-service/azure-sql)?`;
