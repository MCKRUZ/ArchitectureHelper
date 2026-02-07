# AzureCraft MVP Phase 1 - Implementation Plan

**Created**: 2026-02-05
**Status**: Ready for Implementation
**Estimated Duration**: 6-8 weeks (solo developer)

---

## Scope Summary

### In Scope (MVP Phase 1)
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

### Out of Scope (Phase 2+)
- Live Azure import via Resource Graph
- Well-Architected Framework review
- VNet/subnet visual containment
- Bicep/ARM template export
- Multi-user collaboration
- Isometric 3D view

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (apps/web - Next.js 15)                           │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ React Flow Canvas │  │ CopilotKit   │  │ Properties   │  │
│  │ 20 Azure Nodes    │  │ Sidebar Chat │  │ Panel        │  │
│  │ Dagre Layout      │  │ AG-UI State  │  │ Cost Display │  │
│  └────────┬─────────┘  └──────┬───────┘  └──────────────┘  │
│           └────────────────────┼─────────────────────────────┤
│                    AG-UI Protocol (SSE)                      │
├──────────────────────────────────────────────────────────────┤
│  BACKEND (backend/ - ASP.NET Core 9)                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Architect Agent (Azure OpenAI GPT-4)                    ││
│  │ Tools: add_node, remove_node, add_edge, auto_layout     ││
│  └─────────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────────┤
│  MCP SERVER (mcp-servers/AzureCraft.MCP.Pricing)            │
│  └── Azure Retail Prices API (no auth required)             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1.1: Project Setup (Week 1)
**Goal**: Monorepo structure with both stacks running

| Task | Description | Output |
|------|-------------|--------|
| 1.1.1 | Create monorepo structure | `apps/web/`, `backend/`, `mcp-servers/` |
| 1.1.2 | Initialize Next.js 15 app | `apps/web/package.json`, basic app running |
| 1.1.3 | Initialize .NET solution | `backend/AzureCraft.sln` with Clean Architecture |
| 1.1.4 | Set up Tailwind + shadcn/ui | Styling system working |
| 1.1.5 | Set up ESLint + Prettier | Linting configured |
| 1.1.6 | Set up Vitest | Frontend testing ready |
| 1.1.7 | Set up Central Package Management | `Directory.Packages.props` |

**Verification**: `npm run dev` and `dotnet run` both work

---

### Phase 1.2: React Flow Canvas (Week 2)
**Goal**: Interactive canvas with basic nodes

| Task | Description | Output |
|------|-------------|--------|
| 1.2.1 | Install @xyflow/react | Package installed, types working |
| 1.2.2 | Create AzureCanvas component | Basic canvas with zoom/pan |
| 1.2.3 | Create GenericAzureNode component | Base node with icon, name, handles |
| 1.2.4 | Bundle Azure icons (20 core services) | `lib/azure-icons/` with catalog |
| 1.2.5 | Create AzureIcon component | Renders SVG by serviceType |
| 1.2.6 | Add Background, Controls, MiniMap | React Flow plugins working |
| 1.2.7 | Write tests for node components | 80%+ coverage on nodes |

**Core 20 Azure Services**:
1. App Service
2. Function App
3. Virtual Machine
4. Container Apps
5. AKS (Kubernetes)
6. Azure SQL Database
7. Cosmos DB
8. Storage Account (Blob)
9. Redis Cache
10. Virtual Network
11. Application Gateway
12. Load Balancer
13. Azure Front Door
14. Key Vault
15. API Management
16. Service Bus
17. Event Hub
18. Azure OpenAI
19. Entra ID (AAD)
20. Log Analytics

**Verification**: Can manually add nodes to canvas, drag them, connect them

---

### Phase 1.3: Service Palette (Week 3)
**Goal**: Searchable palette with drag-to-canvas

| Task | Description | Output |
|------|-------------|--------|
| 1.3.1 | Create ServicePalette component | Sidebar with service list |
| 1.3.2 | Implement category accordion | Services grouped by category |
| 1.3.3 | Implement fuzzy search | Filter services by name |
| 1.3.4 | Implement drag-and-drop | Drag from palette → canvas |
| 1.3.5 | Add "Recently Used" section | Shows last 5 dragged services |
| 1.3.6 | Write tests for palette | Search and drag behavior tested |

**Verification**: Can search for "SQL", drag it to canvas, see it render

---

### Phase 1.4: CopilotKit Integration (Week 4)
**Goal**: Chat sidebar with shared state

| Task | Description | Output |
|------|-------------|--------|
| 1.4.1 | Install CopilotKit packages | `@copilotkit/react-core`, `@copilotkit/react-ui` |
| 1.4.2 | Create CopilotKit provider in layout | Provider wrapping app |
| 1.4.3 | Define DiagramState type | Shared state interface |
| 1.4.4 | Implement useCoAgent hook | State synced with agent |
| 1.4.5 | Create AgentSidebar component | Chat UI with CopilotSidebar |
| 1.4.6 | Create API route for AG-UI proxy | `/api/copilotkit/route.ts` |
| 1.4.7 | Test state sync (mock agent) | Verify state updates from "agent" |

**Verification**: Can type in chat, mock agent modifies canvas state

---

### Phase 1.5: ASP.NET Backend + Agent (Week 5)
**Goal**: Real agent responding to chat

| Task | Description | Output |
|------|-------------|--------|
| 1.5.1 | Create Domain layer projects | `Domain.Common`, `Domain.Core` |
| 1.5.2 | Create Application layer | DTOs, interfaces, behaviors |
| 1.5.3 | Create Infrastructure.AI | Agent implementation |
| 1.5.4 | Create Presentation.API | AG-UI endpoint |
| 1.5.5 | Configure Azure OpenAI | Connection to GPT-4 |
| 1.5.6 | Implement ArchitectAgent | System prompt + tools |
| 1.5.7 | Implement diagram tools | add_node, remove_node, add_edge, auto_layout |
| 1.5.8 | Map AG-UI endpoint | `/api/copilotkit` working |
| 1.5.9 | Write agent tests | Tool execution tested |

**Agent Tools**:
```csharp
add_node(serviceType, displayName, sku?, region?)
remove_node(nodeId)
update_node(nodeId, changes)
add_edge(sourceId, targetId, connectionType)
remove_edge(edgeId)
create_group(name, childNodeIds)
auto_layout()
```

**Verification**: "Add an App Service" → node appears on canvas

---

### Phase 1.6: Cost Estimation (Week 6)
**Goal**: Live cost calculation

| Task | Description | Output |
|------|-------------|--------|
| 1.6.1 | Create MCP.Pricing project | Standalone MCP server |
| 1.6.2 | Implement get_price tool | Fetch from Azure Retail API |
| 1.6.3 | Implement estimate_monthly tool | Batch estimation |
| 1.6.4 | Create CostBadge component | Shows monthly cost on node |
| 1.6.5 | Create CostPanel component | Total cost breakdown |
| 1.6.6 | Connect agent to MCP server | Agent can call pricing tools |
| 1.6.7 | Add calculate_costs agent tool | Triggers cost recalculation |
| 1.6.8 | Write pricing tests | API responses mocked |

**Verification**: Add 3 services → see total monthly cost estimate

---

### Phase 1.7: Properties Panel + Layout (Week 7)
**Goal**: Node details and auto-layout

| Task | Description | Output |
|------|-------------|--------|
| 1.7.1 | Create PropertiesPanel component | Slide-out panel |
| 1.7.2 | Create Overview tab | Name, SKU, region, cost |
| 1.7.3 | Create Configuration tab | Service-specific settings |
| 1.7.4 | Create Networking tab | Connections list |
| 1.7.5 | Install Dagre | Layout algorithm |
| 1.7.6 | Implement auto_layout tool | Dagre-based positioning |
| 1.7.7 | Add layout animation | Framer Motion transitions |
| 1.7.8 | Wire node selection → panel | Click node → panel opens |

**Verification**: Click node → see details, click "Auto Layout" → nodes rearrange smoothly

---

### Phase 1.8: Polish + Persistence (Week 8)
**Goal**: Save/load, export, dark mode

| Task | Description | Output |
|------|-------------|--------|
| 1.8.1 | Implement localStorage persistence | Save/load diagram state |
| 1.8.2 | Create save/load UI | Buttons in toolbar |
| 1.8.3 | Implement PNG export | html-to-image library |
| 1.8.4 | Implement SVG export | React Flow's toSVG |
| 1.8.5 | Implement dark/light mode | next-themes + Tailwind |
| 1.8.6 | Create ResourceGroupNode | Group boundary component |
| 1.8.7 | Polish UI (shadows, spacing) | Professional appearance |
| 1.8.8 | E2E tests with Playwright | Critical flows tested |
| 1.8.9 | Performance optimization | Memoization, lazy loading |

**Verification**: Full flow - chat to create diagram → save → reload → export PNG

---

## Data Models

### DiagramState (Frontend)
```typescript
interface DiagramState {
  nodes: AzureNode[];
  edges: AzureEdge[];
  groups: ResourceGroup[];
  selectedNodeId: string | null;
  viewMode: '2d';
  costSummary: CostSummary;
  diagramId?: string;
  diagramName: string;
  version: number;
}
```

### AzureNode
```typescript
interface AzureNode {
  id: string;
  type: 'compute' | 'database' | 'network' | 'security' | 'storage' | 'integration' | 'ai';
  position: { x: number; y: number };
  data: AzureNodeData;
  parentId?: string; // For resource group containment
}

interface AzureNodeData {
  serviceType: AzureServiceType;
  displayName: string;
  sku?: string;
  region?: string;
  monthlyCost?: number;
  status: 'proposed' | 'healthy';
  properties: Record<string, unknown>;
}
```

### Agent Request/Response
```csharp
public record AgentRequest
{
    public string SessionId { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
    public DiagramState CurrentState { get; init; } = new();
}

public record AgentResponse
{
    public string Message { get; init; } = string.Empty;
    public DiagramState UpdatedState { get; init; } = new();
    public List<ToolCall> ToolCalls { get; init; } = new();
}
```

---

## API Contracts

### AG-UI Endpoint
```
POST /api/copilotkit
Content-Type: application/json

Request: AG-UI protocol message (SSE stream)
Response: SSE stream with agent responses
```

### MCP Pricing Tools
```
Tool: get_price
Input: { serviceName: string, skuName: string, region: string }
Output: { unitPrice: number, currency: string }

Tool: estimate_monthly
Input: { resources: ResourceEstimate[] }
Output: { total: number, byResource: Record<string, number> }
```

---

## Testing Strategy

| Layer | Framework | Coverage Target |
|-------|-----------|-----------------|
| Frontend Components | Vitest + RTL | 80% |
| Frontend E2E | Playwright | Critical flows |
| Backend Unit | xUnit + Moq | 80% |
| Backend Integration | xUnit + WebApplicationFactory | API endpoints |
| MCP Server | xUnit | Tool execution |

### Critical E2E Flows
1. Load app → drag service to canvas → see node
2. Type "Add an App Service" → node appears
3. Add 3 services → see cost total
4. Click node → properties panel opens
5. Save diagram → reload → diagram restored
6. Export as PNG → valid image file

---

## Dependencies

### Frontend (package.json)
```json
{
  "dependencies": {
    "next": "^15.0.0",
    "@xyflow/react": "^12.0.0",
    "@copilotkit/react-core": "latest",
    "@copilotkit/react-ui": "latest",
    "framer-motion": "^11.0.0",
    "dagre": "^0.8.5",
    "html-to-image": "^1.11.0",
    "next-themes": "^0.3.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "@testing-library/react": "^16.0.0",
    "vitest": "^2.0.0",
    "@playwright/test": "^1.45.0"
  }
}
```

### Backend (Directory.Packages.props)
```xml
<PackageVersion Include="MediatR" Version="14.0.0" />
<PackageVersion Include="FluentValidation" Version="12.1.0" />
<PackageVersion Include="AutoMapper" Version="16.0.0" />
<PackageVersion Include="Ardalis.GuardClauses" Version="5.0.0" />
<PackageVersion Include="Azure.AI.OpenAI" Version="2.8.0-beta.1" />
<PackageVersion Include="Microsoft.Extensions.AI" Version="10.2.0" />
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| CopilotKit learning curve | Follow official examples, start with mock agent |
| AG-UI protocol complexity | Implement incrementally, test each tool |
| Azure Pricing API rate limits | Cache responses, batch requests |
| React Flow performance (many nodes) | Memoize nodes, virtualize large diagrams |
| Azure OpenAI costs | Use GPT-4o-mini for development |

---

## Success Criteria

MVP Phase 1 is complete when:
- [ ] User can create architecture via chat
- [ ] 20 Azure services available in palette
- [ ] Cost estimation shows for all nodes
- [ ] Diagrams can be saved and loaded
- [ ] PNG/SVG export works
- [ ] Dark/light mode works
- [ ] All E2E tests pass
- [ ] 80%+ test coverage

---

## Next Steps After MVP

Phase 2 priorities:
1. Live Azure import (Resource Graph MCP)
2. Well-Architected Framework review agent
3. Bicep/ARM export
4. VNet visual containment
