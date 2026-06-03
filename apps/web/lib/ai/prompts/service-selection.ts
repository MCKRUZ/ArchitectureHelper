/**
 * Service selection decision trees.
 * Replaces the flat "available services" list with conditional selection logic
 * informed by Azure Skills knowledge (azure-compute, azure-storage, azure-ai).
 */

export const SERVICE_SELECTION = `## Service Selection Decision Trees

When choosing services, follow these decision trees instead of defaulting to the same service every time.

### Compute Selection
- **Web API / traditional web app** → \`app-service\` (Premium v3 for production)
  - Simple web apps, REST APIs, monoliths, low operational overhead
- **Microservices / custom runtime / sidecar pattern** → \`container-apps\`
  - Event-driven scaling (KEDA), Dapr integration, multiple containers per app
  - Pick over App Service when: >3 microservices, custom Docker images, need sidecar pattern
- **Container orchestration, >5 microservices, advanced networking** → \`aks\`
  - Full Kubernetes control plane, custom operators, GPU workloads, service mesh
  - Pick over Container Apps when: need node-level control, custom CNI, or >20 services
- **Background jobs / event-driven** → \`function-app\`
  - Consumption plan: sporadic triggers (<1M executions/month)
  - Premium EP1+: consistent load, VNet integration needed, >10s execution time
- **Static frontend / SPA / Jamstack** → \`static-web-app\`
  - React/Angular/Vue SPAs with serverless API backend
- **Legacy / lift-and-shift / specific OS needs** → \`virtual-machine\`
  - Only when containerization is not feasible

### Database Selection
- **Relational / transactional / ACID / SQL queries** → \`azure-sql\`
  - Strong consistency, complex joins, stored procedures, existing SQL Server workloads
  - General Purpose for most workloads; Business Critical for <5ms latency
- **Multi-model / global distribution / NoSQL** → \`cosmos-db\`
  - Document, graph, key-value, or column-family models
  - Multi-region writes, <10ms reads globally, event sourcing with change feed
  - Serverless for dev/test or spiky workloads; Provisioned for steady throughput
- **Both relational AND document needs** → use BOTH \`azure-sql\` + \`cosmos-db\`
  - SQL for transactions/reporting, Cosmos for user profiles/catalogs/session state

### Caching Strategy
- **Always add \`redis-cache\`** when any database is present
  - Session state, API response caching, rate limiting, leaderboards
  - Basic for dev; Standard for production; Premium for VNet + clustering

### Storage Selection
- **Always include \`storage-account\`** — blobs for assets/logs, queues for lightweight messaging, tables for config
  - Hot: frequently accessed data
  - Cool: infrequent access (backups, logs >30 days)
  - Archive: compliance/audit data retained for years

### Networking Selection
- **Global CDN + WAF + multi-region routing** → \`front-door\` (Premium for private link origins)
- **Regional WAF + URL routing + SSL termination** → \`application-gateway\` (WAF v2)
- **TCP/UDP load balancing (non-HTTP)** → \`load-balancer\` (Standard)
- **API facade + rate limiting + developer portal** → \`api-management\`
  - Consumption for serverless APIs; Developer for internal; Standard/Premium for production

### AI/ML Selection
- **LLM / chat / embeddings** → \`azure-openai\`
  - GPT-4o for high-quality reasoning; GPT-4o-mini for cost-efficient tasks
  - PTU for predictable latency; Pay-as-you-go for variable demand
- **Search / RAG retrieval** → \`ai-search\`
  - Hybrid search (keyword + vector) with semantic ranker for RAG pipelines
  - Always pair with azure-openai for embedding generation

### Messaging Selection
- **Reliable async messaging / decoupling** → \`service-bus\`
  - Topics for pub/sub, queues for point-to-point, sessions for ordered processing
  - Standard for most; Premium for VNet + guaranteed throughput
- **High-throughput event streaming** → \`event-hub\`
  - IoT telemetry, clickstream, log aggregation (millions of events/sec)
- **Event-driven reactions / lightweight routing** → \`event-grid\`
  - Storage blob events, resource changes, custom domain events`;
