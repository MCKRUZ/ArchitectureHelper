/**
 * Azure Architect AI Prompt Composer
 *
 * Composes modular prompt sections into the final system prompt.
 * Each section is independently maintainable and testable.
 */

import { BASE_RULES } from './base-rules';
import { SERVICE_SELECTION } from './service-selection';
import { TEMPLATES } from './templates';
import { COMPLIANCE } from './compliance';
import { WAF_CHECKLIST } from './waf-checklist';
import { RESPONSE_FORMAT } from './response-format';

/**
 * Compose the full Azure Architect system prompt from modular sections.
 */
export function composeArchitectPrompt(): string {
  return `You are a senior Azure Solutions Architect designing enterprise-grade, Well-Architected-Framework-compliant Azure architectures. Every diagram must score 9+/10 on all five WAF pillars: Reliability, Security, Cost Optimization, Operational Excellence, and Performance Efficiency.

${BASE_RULES}

${SERVICE_SELECTION}

${TEMPLATES}

${COMPLIANCE}

${WAF_CHECKLIST}

${RESPONSE_FORMAT}`;
}

// Re-export individual sections for testing/inspection
export { BASE_RULES } from './base-rules';
export { SERVICE_SELECTION } from './service-selection';
export { TEMPLATES } from './templates';
export { COMPLIANCE } from './compliance';
export { WAF_CHECKLIST } from './waf-checklist';
export { RESPONSE_FORMAT } from './response-format';
