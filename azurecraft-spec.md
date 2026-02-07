# AzureCraft — AI-Native Azure Infrastructure Designer

## Project Specification & Architecture Reference

---

## Executive Summary

### The Problem

Designing Azure architecture today is fragmented and manual. Teams sketch in Visio or PowerPoint with no intelligence behind the boxes. Cloudcraft exists but is AWS-first. Enterprise architects spend hours translating business requirements into compliant, cost-optimized diagrams — then those diagrams go stale the moment someone deploys a change.

### The Solution

An AI-powered interactive canvas where you *describe* what you need and a solutions architect agent builds it visually in real-time. It knows Azure patterns, calculates costs live, validates against the Well-Architected Framework, and can import your actual running infrastructure so diagrams are never out of date.

### Who It's For

Azure architects, cloud engineering leads, and pre-sales teams at consultancies (like EY) who need to go from client conversation to professional, validated architecture diagram in minutes instead of days — and need those diagrams to be *living documents*, not static artifacts.

### Competitive Positioning

Cloudcraft is a **drawing tool that knows about cloud**. AzureCraft is a **cloud intelligence tool that happens to have beautiful visual output**. The agent understands Azure architecture patterns; the canvas is just the rendering surface for shared state.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js + React Flow + CopilotKit)               │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ React Flow Canvas │  │ CopilotKit   │  │ Properties   │  │
│  │ (@xyflow/react)   │  │ Sidebar/Chat │  │ Panel + Cost │  │
│  │ Custom Azure Nodes│  │ AG-UI Events │  │ Breakdown    │  │
│  └────────┬─────────┘  └──────┬───────┘  └──────────────┘  │
│           │    Shared State    │                              │
│           └────────┬───────────┘                              │
│                    │ AG-UI Protocol (SSE)                     │
├────────────────────┼─────────────────────────────────────────┤
│  AG-UI BACKEND (ASP.NET Core / Agent Framework)              │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────────────────┐ │
│  │ Architect    │ │ Cost         │ │ Well-Architected      │ │
│  │ Agent        │ │ Analyzer     │ │ Reviewer Agent        │ │
│  │ (primary)    │ │ Agent        │ │                       │ │
│  └──────┬──────┘ └──────┬───────┘ └───────────┬───────────┘ │
│         │               │                     │              │
├─────────┼───────────────┼─────────────────────┼──────────────┤
│  MCP SERVERS                                                 │
│  ┌──────────────┐ ┌────────────┐ ┌────────────┐ ┌────────┐ │
│  │ Azure        │ │ Azure      │ │ Diagram    │ │ Azure  │ │
│  │ Resource     │ │ Pricing    │ │ Storage    │ │ Docs   │ │
│  │ Graph        │ │ API        │ │ (Cosmos)   │ │ Search │ │
│  └──────────────┘ └────────────┘ └────────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend Framework | Next.js (App Router) | SSR, routing, API routes |
| Canvas Library | @xyflow/react (React Flow v12) | Interactive node-based diagram canvas |
| Agent UI Framework | CopilotKit + AG-UI Protocol | Agent ↔ frontend shared state, streaming, generative UI |
| UI Components | Tailwind CSS + shadcn/ui | Styling and component library |
| Animation | Framer Motion | Smooth node transitions and layout animations |
| Agent Backend | ASP.NET Core + Microsoft Agent Framework | Multi-agent orchestration with AG-UI endpoint |
| AI Model | Azure OpenAI (GPT-4.1 / GPT-4o) | LLM reasoning for architecture design |
| MCP Transport | SSE / stdio | Tool servers for Azure integration |
| Icon Library | Official Azure Architecture Icons (705 SVGs) | Service iconography |
| Auto-Layout | Dagre / ELK.js | Automatic graph layout algorithms |
| Persistence | Azure Cosmos DB or Blob Storage | Diagram storage and versioning |
| Auth | Microsoft Entra ID (MSAL) | Azure resource access + user auth |

---

## Layer 1: Frontend — React Flow Canvas

### Core Library: @xyflow/react

React Flow provides everything needed at the interaction level — zoom, pan, drag, multi-select, minimap, keyboard shortcuts. Critically, nodes are actual React components rendered in the DOM (not Canvas-drawn), which enables deep customization.

**Key React Flow features to leverage:**
- Custom node types with multiple connection handles
- Group/parent nodes for Resource Groups and VNets (nested containment)
- Custom edge types with animated data flow
- MiniMap, Controls, and Background plugins
- Built-in keyboard shortcuts (delete, select-all, etc.)
- Hooks: `useNodesState`, `useEdgesState`, `useReactFlow`

### Custom Azure Node Component

```typescript
// Types for the Azure node data model
interface AzureNodeData {
  serviceType: AzureServiceType;    // e.g., 'app-service', 'sql-database', 'vnet'
  displayName: string;
  resourceId?: string;              // ARM resource ID if imported from live Azure
  sku?: string;                     // e.g., 'P1v3', 'Standard_D4s_v3'
  region?: string;                  // e.g., 'eastus2'
  monthlyCost?: number;             // Estimated monthly cost in USD
  status?: 'healthy' | 'warning' | 'error' | 'proposed';
  properties: Record<string, any>;  // Service-specific configuration
  iconSvg: string;                  // SVG content from Azure icon set
  category: AzureServiceCategory;   // 'compute' | 'networking' | 'data' | 'security' | etc.
}

// Service categories for palette organization
type AzureServiceCategory =
  | 'compute'
  | 'networking'
  | 'databases'
  | 'storage'
  | 'security'
  | 'integration'
  | 'ai-ml'
  | 'analytics'
  | 'devops'
  | 'identity'
  | 'management'
  | 'web'
  | 'containers'
  | 'messaging';

// Edge data for connections between services
interface AzureEdgeData {
  connectionType: 'private-endpoint' | 'vnet-integration' | 'public' | 'service-endpoint' | 'peering';
  protocol?: string;                // e.g., 'HTTPS', 'AMQP', 'SQL'
  port?: number;
  bandwidthEstimate?: string;
  isEncrypted: boolean;
}

// Resource Group as a group/parent node
interface ResourceGroupData {
  name: string;
  subscriptionId?: string;
  location: string;
  tags?: Record<string, string>;
  totalMonthlyCost?: number;
}
```

### Visual Design Requirements

Each custom node renders as a polished card with:
- Official Azure SVG icon (from Microsoft's 705-icon set)
- Service display name
- SKU badge (subtle pill/tag)
- Cost indicator (monthly estimate)
- Status dot (green/yellow/red/blue-dashed for proposed)
- Connection handles (top, bottom, left, right) styled to match Azure's design language

**Visual Modes:**

1. **Standard 2D View** — Clean flat layout, the primary working mode
2. **Isometric View** — CSS transforms on the canvas for Cloudcraft-style 3D-ish perspective
3. **Cost Heatmap Mode** — Nodes glow from cool blue to hot red based on cost contribution percentage
4. **Compliance View** — Nodes highlighted by Well-Architected Framework findings (red = critical, amber = warning, green = compliant)

**Visual Polish Targets:**
- Animated connection lines — data flow animations along edges using SVG `stroke-dashoffset`
- Smooth layout transitions — when the agent rearranges nodes, animate with Framer Motion
- Dark/light mode with enterprise-grade theming
- Subtle drop shadows, rounded corners, consistent spacing
- Group nodes (VNets, Resource Groups) with labeled boundary boxes and dashed borders

### Azure Icon Library Integration

Microsoft publishes 705 official Azure architecture icons as SVGs, explicitly licensed for architecture diagrams. Bundle these and build a searchable service palette.

**Source:** https://learn.microsoft.com/en-us/azure/architecture/icons/
**Alternative indexed source:** https://az-icons.com/ (705 icons, November 2025 version)

Icons should be:
- Bundled as an importable catalog with metadata (service name, category, description)
- Searchable/filterable in a sidebar palette
- Drag-and-drop from palette to canvas

### Service Palette Component

A sidebar with:
- Search bar (fuzzy match on service name)
- Category accordion sections (Compute, Networking, Databases, etc.)
- Each item shows icon + name, draggable onto canvas
- Recently used section at top
- "Suggested" section that the agent can populate contextually

---

## Layer 2: AG-UI + CopilotKit — Agent-Frontend Bridge

### Protocol Choice: AG-UI

AG-UI (Agent-User Interaction Protocol) is the open standard from CopilotKit that standardizes how AI agents connect to user-facing applications. It provides:
- Real-time streaming via SSE
- Shared state synchronization between frontend and agent
- Tool call rendering (Generative UI)
- Human-in-the-loop patterns
- Session management

**Key integration:** Microsoft Agent Framework has first-party AG-UI support via `MapAGUI()`.

### Shared State Contract

The diagram itself IS the shared state. Both the frontend (user interactions) and the agent (AI modifications) read and write to the same state object:

```typescript
interface DiagramState {
  // Canvas state
  nodes: AzureNode[];
  edges: AzureEdge[];
  groups: ResourceGroupBoundary[];
  
  // UI state
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  viewMode: '2d' | 'isometric' | 'cost-heatmap' | 'compliance';
  zoom: number;
  
  // Agent-computed derivations
  costSummary: {
    monthly: number;
    byService: Record<string, number>;
    byResourceGroup: Record<string, number>;
    comparedToBaseline?: {
      baselineMonthly: number;
      delta: number;
      deltaPercent: number;
    };
  };
  
  // Well-Architected review results
  validationResults: ArchReviewFinding[];
  suggestedOptimizations: Optimization[];
  
  // Metadata
  diagramId?: string;
  diagramName: string;
  lastModified: string;
  version: number;
}

interface ArchReviewFinding {
  pillar: 'reliability' | 'security' | 'cost' | 'operational-excellence' | 'performance';
  severity: 'critical' | 'warning' | 'info';
  nodeId: string;
  title: string;
  description: string;
  recommendation: string;
}

interface Optimization {
  id: string;
  title: string;
  currentCost: number;
  optimizedCost: number;
  savings: number;
  affectedNodes: string[];
  changes: StateChange[];
  riskLevel: 'low' | 'medium' | 'high';
}
```

### CopilotKit Integration

```typescript
// Frontend: Shared state hook
const { state, setState } = useCoAgent<DiagramState>({
  name: "azure_architect",
  initialState: {
    nodes: [],
    edges: [],
    groups: [],
    selectedNodeId: null,
    viewMode: '2d',
    costSummary: { monthly: 0, byService: {}, byResourceGroup: {} },
    validationResults: [],
    suggestedOptimizations: [],
    diagramName: 'Untitled Architecture',
    version: 1,
  },
});

// Generative UI: Rich property panel when agent returns resource details
useCoAgentStateRender({
  name: "azure_architect",
  render: ({ state }) => {
    if (state.selectedNodeId) {
      return <ResourceDetailPanel node={findNode(state, state.selectedNodeId)} />;
    }
    return null;
  },
});

// Human-in-the-loop: Confirmation before major changes
useCopilotAction({
  name: "apply_optimization",
  parameters: [
    { name: "optimization_id", type: "string", required: true },
    { name: "summary", type: "string", required: true },
    { name: "cost_savings", type: "number", required: true },
  ],
  renderAndWaitForResponse: ({ args, status, respond }) => (
    <OptimizationApproval
      summary={args.summary}
      savings={args.cost_savings}
      isExecuting={status === "executing"}
      onApprove={() => respond?.({ approved: true })}
      onReject={() => respond?.({ approved: false })}
    />
  ),
});
```

### Frontend Tool Registrations

Tools the agent can invoke that render UI components:

| Tool Name | Purpose | UI Rendered |
|---|---|---|
| `show_resource_details` | Deep-dive on a selected resource | Tabbed panel: Config, Networking, Cost, Compliance |
| `show_cost_comparison` | Compare current vs. optimized | Side-by-side bar chart with delta |
| `show_architecture_review` | Well-Architected findings | Finding cards grouped by pillar with severity badges |
| `request_architecture_approval` | Confirm before major refactor | Diff view showing before/after with approve/reject |
| `show_deployment_template` | ARM/Bicep template preview | Syntax-highlighted code panel with copy button |
| `suggest_services` | Recommend services to add | Card grid with icons, descriptions, estimated costs |

---

## Layer 3: Agent Backend — Microsoft Agent Framework

### Runtime: ASP.NET Core with AG-UI

```csharp
// Program.cs — Conceptual setup
var builder = WebApplication.CreateBuilder(args);

// Register agent with Azure OpenAI
builder.Services.AddAzureOpenAI(options => {
    options.Endpoint = "https://<instance>.openai.azure.com/";
    options.DeploymentName = "gpt-4.1";
});

// Register MCP server connections
builder.Services.AddMcpClient("azure-resource-graph", "http://localhost:5010");
builder.Services.AddMcpClient("azure-pricing", "http://localhost:5011");
builder.Services.AddMcpClient("diagram-storage", "http://localhost:5012");
builder.Services.AddMcpClient("azure-docs", "http://localhost:5013");

var app = builder.Build();

// Map the AG-UI endpoint
app.MapAGUI("/api/agent", architectAgent);
app.Run();
```

### Multi-Agent Design

#### Primary Agent: Architecture Designer

The main agent users interact with. It understands Azure architecture patterns and translates natural language requests into diagram state mutations.

**System Prompt Core:**
```
You are an expert Azure Solutions Architect. You help users design, 
visualize, and optimize Azure infrastructure through an interactive 
diagram canvas.

You have tools to:
- Add, remove, and modify Azure service nodes on the canvas
- Create connections between services
- Group resources into Resource Groups and VNets
- Import live infrastructure from Azure subscriptions
- Calculate costs and compare scenarios
- Review architectures against the Well-Architected Framework

When a user describes what they need, translate their requirements 
into a complete, well-architected Azure solution. Always consider:
- Security (private endpoints, NSGs, managed identity)
- Reliability (availability zones, geo-redundancy)
- Cost optimization (right-sizing, reserved instances)
- Operational excellence (monitoring, alerting, IaC)
- Performance (caching, CDN, scaling)

Lay out diagrams logically with clear data flow direction.
```

**Tools:**
- `add_node(serviceType, displayName, sku, region, properties)` — Add Azure service to canvas
- `remove_node(nodeId)` — Remove a service
- `update_node(nodeId, changes)` — Modify service properties/SKU
- `add_edge(sourceId, targetId, connectionType, protocol, port)` — Connect services
- `remove_edge(edgeId)` — Remove connection
- `create_group(type, name, childNodeIds)` — Create Resource Group or VNet boundary
- `auto_layout(algorithm)` — Re-layout the diagram using Dagre/ELK
- `import_from_azure(subscriptionId, resourceGroup?)` — Import live infrastructure
- `export_bicep()` — Generate Bicep/ARM template from diagram
- `calculate_costs()` — Estimate monthly costs for all resources

#### Sub-Agent: Cost Analyzer

Focused agent that calls the Azure Pricing MCP server and produces structured cost analysis.

**Responsibilities:**
- Calculate per-resource monthly estimates
- Compare scenarios (current vs. proposed)
- Identify cost optimization opportunities (reserved instances, right-sizing, unused resources)
- Produce cost breakdown by Resource Group, by service category

#### Sub-Agent: Well-Architected Reviewer

Analyzes the current diagram against Microsoft's five pillars.

**Responsibilities:**
- Security: Missing NSGs, public endpoints without WAF, no managed identity
- Reliability: Single points of failure, no availability zones, missing health probes
- Cost: Over-provisioned SKUs, services without auto-scale
- Operational Excellence: Missing monitoring, no diagnostic settings
- Performance: Missing caching layers, suboptimal regions for latency

**Output:** Structured findings with severity, affected nodes, and recommended fixes that the Architect agent can apply.

---

## Layer 4: MCP Servers

### Azure Resource Graph MCP

**Purpose:** Query live Azure infrastructure for import and sync.

**Tools:**
| Tool | Description |
|---|---|
| `query_resources(query)` | Execute ARG Kusto query |
| `get_resource_details(resourceId)` | Get full ARM resource properties |
| `list_subscriptions()` | List accessible subscriptions |
| `list_resource_groups(subscriptionId)` | List RGs in a subscription |
| `get_network_topology(subscriptionId)` | Get VNet/subnet/peering topology |

**Auth:** Service principal or managed identity with Reader role. User-delegated auth via MSAL for their own subscriptions.

### Azure Pricing MCP

**Purpose:** Real-time cost estimation using the Azure Retail Prices API.

**Tools:**
| Tool | Description |
|---|---|
| `get_price(serviceName, skuName, region)` | Get unit price for a specific SKU |
| `estimate_monthly(resources[])` | Batch estimate for multiple resources |
| `compare_skus(serviceName, region)` | Compare pricing across SKU tiers |
| `get_reserved_pricing(serviceName, sku, term)` | Get 1yr/3yr reserved pricing |

**API:** https://prices.azure.com/api/retail/prices (no auth required, public API)

### Diagram Storage MCP

**Purpose:** Persist and version diagrams.

**Tools:**
| Tool | Description |
|---|---|
| `save_diagram(diagramState)` | Save current state |
| `load_diagram(diagramId)` | Load a saved diagram |
| `list_diagrams(userId)` | List user's diagrams |
| `get_diagram_version(diagramId, version)` | Load specific version |
| `diff_diagrams(diagramIdA, diagramIdB)` | Compare two diagram states |
| `share_diagram(diagramId, targetUserId, permission)` | Share with team |

**Storage:** Azure Cosmos DB (JSON documents) or Azure Blob Storage (for larger diagrams with history).

### Azure Docs MCP

**Purpose:** RAG over Azure documentation for contextual answers.

**Tools:**
| Tool | Description |
|---|---|
| `search_docs(query)` | Semantic search over Azure docs |
| `get_service_limits(serviceName)` | Retrieve service quotas and limits |
| `get_architecture_pattern(patternName)` | Retrieve reference architecture |
| `get_sku_details(serviceName)` | Get detailed SKU comparison |

**Implementation:** Azure AI Search index over Azure documentation, or use the existing Azure docs search API.

---

## Interactive Features (Click-Through Experience)

### Progressive Zoom Levels

| Zoom Level | What's Visible |
|---|---|
| Zoomed out (< 50%) | Service icons + names only, group boundaries |
| Default (50-100%) | Icons, names, SKU badges, cost indicators, connection labels |
| Zoomed in (100-150%) | Expanded cards with key config properties |
| Deep zoom (> 150%) | Nested resources appear (e.g., SQL Server → databases, firewall rules, elastic pools) |

### Node Click Interaction

Clicking a node opens a slide-out properties panel with tabs:
- **Overview** — Service name, SKU, region, resource group, cost
- **Configuration** — Key service-specific settings
- **Networking** — Connections, endpoints, NSG rules
- **Cost** — Detailed cost breakdown, optimization suggestions
- **Compliance** — Well-Architected findings for this resource
- **Chat** — Scoped mini-chat for questions about this specific resource

### Right-Click Context Menu

- Show dependencies (highlight upstream/downstream)
- Estimate cost
- Check compliance
- Replace with alternative service
- Duplicate
- Delete
- Open in Azure Portal (deep-link using ARM resource ID)
- Generate Bicep for this resource

### Edge Interactions

Clicking a connection line shows:
- Connection type (private endpoint, VNet integration, public)
- Protocol and port
- Encryption status
- Bandwidth estimate
- Option to change connection type

### Scenario Mode

Fork the current diagram to create a comparison scenario:
- Side-by-side view: Current vs. Proposed
- Cost delta overlay showing savings/increases
- Diff highlighting (green = added, red = removed, amber = modified)
- Merge back when satisfied

---

## AI-Powered Workflows

### Natural Language → Architecture

User says: *"I need a web app with a database that handles 10,000 concurrent users and needs to be HIPAA compliant"*

Agent generates a complete diagram:
- App Service (Isolated tier for HIPAA)
- Azure SQL with TDE and auditing
- VNet integration with private endpoints
- Application Gateway with WAF v2
- Azure Key Vault for secrets management
- Log Analytics + Azure Monitor
- Microsoft Entra ID for authentication
- All laid out with proper grouping and connections

### Live Import → Optimize

User says: *"Import my production subscription and find cost savings"*

1. Agent calls Azure Resource Graph MCP → retrieves all resources
2. Auto-layouts on canvas with proper groupings
3. Cost Analyzer sub-agent calculates current spend
4. Well-Architected Reviewer identifies issues
5. Agent suggests optimizations with savings estimates
6. User approves changes → diagram updates with before/after comparison

### Architecture Review

User says: *"Review this architecture for security gaps"*

Agent analyzes the diagram and produces findings:
- "SQL Database has a public endpoint — recommend private endpoint"
- "App Service missing VNet integration — data traverses public internet"
- "No WAF in front of public-facing endpoint"
- "Key Vault not using RBAC — still using access policies"

Each finding links to the affected node, and the user can say "fix it" to have the agent apply the recommendation.

---

## Effort Estimates

| Component | Effort | Complexity | Notes |
|---|---|---|---|
| React Flow canvas + custom Azure nodes | 3-4 weeks | Medium | Many node types but pattern is repetitive |
| Azure SVG icon library integration | 1 week | Low | Microsoft provides SVGs, build the catalog |
| CopilotKit + AG-UI integration | 2-3 weeks | Medium | Well-documented, shared state design is key |
| Agent Framework backend + AG-UI endpoint | 2-3 weeks | Medium | Familiar stack |
| Azure Resource Graph MCP | 1-2 weeks | Medium | Auth is the hardest part |
| Azure Pricing MCP | 1 week | Low | REST API wrapper, no auth needed |
| Diagram persistence layer | 1 week | Low | Cosmos DB / Blob Storage |
| Auto-layout engine (Dagre/ELK) | 1-2 weeks | Medium | Making layouts look *designed* not *computed* |
| Visual polish, animations, themes | 2-3 weeks | High | Where "looks amazing" lives |
| **Total MVP** | **~14-20 weeks** | | **For a team of 2-3** |

**Solo prototype timeline:** 6-8 weeks by starting with 15-20 core Azure services, no live import initially, basic layout.

---

## MVP Scope (Phase 1)

### In Scope
- [ ] React Flow canvas with 20 core Azure service node types
- [ ] Service palette with search and drag-to-canvas
- [ ] CopilotKit sidebar chat with AG-UI shared state
- [ ] Agent can add/remove/connect nodes via natural language
- [ ] Cost estimation via Azure Pricing API
- [ ] Basic auto-layout (Dagre)
- [ ] Resource Group grouping
- [ ] Node click → properties panel
- [ ] Export diagram as PNG/SVG
- [ ] Dark/light mode
- [ ] Save/load diagrams (local storage initially)

### Phase 2
- [ ] Live Azure import via Resource Graph
- [ ] Well-Architected Framework review
- [ ] VNet/subnet visual containment
- [ ] Animated data flow on edges
- [ ] Scenario comparison mode
- [ ] Bicep/ARM template export
- [ ] Isometric 3D view toggle
- [ ] Cost heatmap mode

### Phase 3
- [ ] Multi-user collaboration (real-time)
- [ ] Diagram versioning and diff
- [ ] Integration with Azure DevOps / GitHub
- [ ] Embeddable diagrams (iframe/Confluence plugin)
- [ ] Custom/third-party service icons
- [ ] Terraform export
- [ ] Compliance templates (HIPAA, SOC2, PCI-DSS)

---

## Key Dependencies & Links

| Resource | URL |
|---|---|
| React Flow (xyflow) | https://reactflow.dev |
| CopilotKit | https://www.copilotkit.ai |
| AG-UI Protocol Docs | https://docs.ag-ui.com |
| AG-UI + Agent Framework | https://learn.microsoft.com/en-us/agent-framework/integrations/ag-ui/ |
| Azure Architecture Icons | https://learn.microsoft.com/en-us/azure/architecture/icons/ |
| Azure Icons (indexed, searchable) | https://az-icons.com/ |
| Azure Retail Prices API | https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices |
| Azure Resource Graph | https://learn.microsoft.com/en-us/azure/governance/resource-graph/ |
| Dagre (layout algorithm) | https://github.com/dagrejs/dagre |
| ELK.js (layout algorithm) | https://github.com/kieler/elkjs |
| Cloudcraft (competitor reference) | https://www.cloudcraft.co |
| CopilotKit Generative UI Examples | https://github.com/CopilotKit/generative-ui |
| AG-UI Dojo (reference implementations) | https://github.com/CopilotKit/ag-ui |
| Ben Coleman Azure Icon Collection | https://code.benco.io/icon-collection/ |

---

## File Structure (Recommended)

```
azurecraft/
├── apps/
│   └── web/                          # Next.js frontend
│       ├── app/
│       │   ├── page.tsx              # Main canvas page
│       │   ├── layout.tsx            # Root layout with CopilotKit provider
│       │   └── api/
│       │       └── copilotkit/       # AG-UI API route (proxy to backend)
│       ├── components/
│       │   ├── canvas/
│       │   │   ├── AzureCanvas.tsx   # React Flow wrapper
│       │   │   ├── nodes/            # Custom node components per service category
│       │   │   │   ├── ComputeNode.tsx
│       │   │   │   ├── DatabaseNode.tsx
│       │   │   │   ├── NetworkNode.tsx
│       │   │   │   ├── SecurityNode.tsx
│       │   │   │   └── GenericAzureNode.tsx
│       │   │   ├── edges/
│       │   │   │   ├── AnimatedEdge.tsx
│       │   │   │   └── PrivateEndpointEdge.tsx
│       │   │   ├── groups/
│       │   │   │   ├── ResourceGroupNode.tsx
│       │   │   │   └── VNetBoundary.tsx
│       │   │   └── controls/
│       │   │       ├── ServicePalette.tsx
│       │   │       ├── ZoomControls.tsx
│       │   │       └── ViewModeToggle.tsx
│       │   ├── panels/
│       │   │   ├── PropertiesPanel.tsx
│       │   │   ├── CostPanel.tsx
│       │   │   ├── CompliancePanel.tsx
│       │   │   └── ScenarioCompare.tsx
│       │   ├── chat/
│       │   │   └── AgentSidebar.tsx   # CopilotKit chat sidebar
│       │   └── shared/
│       │       ├── AzureIcon.tsx      # Icon renderer component
│       │       └── CostBadge.tsx
│       ├── lib/
│       │   ├── azure-icons/          # Bundled SVG icon catalog
│       │   │   ├── icons/            # 705 SVG files
│       │   │   ├── catalog.ts        # Searchable metadata index
│       │   │   └── categories.ts     # Category definitions
│       │   ├── diagram-state.ts      # Shared state types and defaults
│       │   ├── layout.ts             # Dagre/ELK layout functions
│       │   └── export.ts             # PNG/SVG/Bicep export utilities
│       └── styles/
│           └── azure-theme.css       # Azure-inspired design tokens
│
├── backend/                          # ASP.NET Core AG-UI backend
│   ├── Agents/
│   │   ├── ArchitectAgent.cs         # Primary architect agent
│   │   ├── CostAnalyzerAgent.cs      # Cost analysis sub-agent
│   │   └── ReviewerAgent.cs          # WAF reviewer sub-agent
│   ├── Tools/
│   │   ├── DiagramTools.cs           # Canvas manipulation tools
│   │   ├── CostTools.cs              # Cost estimation tools
│   │   └── ReviewTools.cs            # Architecture review tools
│   ├── Program.cs                    # App setup with MapAGUI
│   └── appsettings.json
│
├── mcp-servers/
│   ├── azure-resource-graph/         # C# or Python MCP server
│   ├── azure-pricing/                # Azure Pricing API wrapper
│   ├── diagram-storage/              # Cosmos DB persistence
│   └── azure-docs/                   # Azure docs RAG search
│
└── docs/
    ├── architecture.md               # This document
    ├── service-catalog.md            # Supported Azure services list
    └── agent-prompts.md              # System prompts for agents
```

---

## Design Inspiration

Study these for UX/UI patterns:

1. **Cloudcraft** (https://cloudcraft.co) — 2D/3D toggle, clean service palette, cost overlay
2. **Excalidraw** (https://excalidraw.com) — Hand-drawn aesthetic, real-time collaboration, simplicity
3. **Figma** — Properties panel design, zoom behavior, multi-select interactions
4. **n8n** (https://n8n.io) — Node-based workflow editor, connection animations
5. **Azure Architecture Center** (https://learn.microsoft.com/en-us/azure/architecture/) — Reference diagram style and patterns
