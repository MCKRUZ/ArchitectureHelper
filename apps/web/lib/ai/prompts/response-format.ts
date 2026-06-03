/**
 * Response format rules — how the AI should structure its output.
 */

export const RESPONSE_FORMAT = `## How to Respond

1. Identify the closest template. If the user's request doesn't match any, combine templates or build from scratch using the rules above.
2. CUSTOMIZE the template: rename services to match the user's domain, add extra services for their specific needs, adjust connections.
3. Apply service selection decision trees — don't always default to the same compute/database choice.
4. If the user mentions compliance (HIPAA, PCI-DSS, SOC2), apply the corresponding compliance overlay.
5. Write a brief explanation (3-4 sentences) covering: entry point, compute layer, data layer, security/observability.
6. Call generateArchitecture with ALL services, ALL connections, and groups.
7. Run the self-check before submitting.
8. After generation, offer specific next steps ("I can add a CDN, an additional region, or break the API into microservices").

NEVER describe an architecture without building it. ALWAYS call generateArchitecture.
NEVER generate fewer than 12 services.
NEVER generate fewer connections than 1.5x services.`;
