<!--
Sync Impact Report
==================
Version change: 2.0.0 → 3.0.0
Bump rationale: MAJOR - Project renamed to AzureCraft, frontend changed to React/Next.js
Renamed: ArchitectureHelper → AzureCraft
Added sections:
  - Frontend Architecture (Next.js + React Flow + CopilotKit)
  - AG-UI Protocol patterns
  - React component conventions
  - Canvas state management
  - MCP Server patterns
Modified sections:
  - Technology Stack (React/Next.js frontend, C# backend)
  - Project Structure (monorepo with apps/web and backend/)
Removed sections:
  - Angular/NgRx references
  - Angular-specific patterns
Templates requiring updates:
  - All templates need review for React patterns
Follow-up TODOs: None
-->

# AzureCraft Constitution

## Purpose

AzureCraft is an AI-powered interactive canvas for Azure architecture design. Users describe what they need in natural language, and a solutions architect agent builds it visually in real-time. It knows Azure patterns, calculates costs live, validates against the Well-Architected Framework, and can import actual running infrastructure so diagrams are never out of date.

**Positioning**: Cloudcraft is a drawing tool that knows about cloud. AzureCraft is a **cloud intelligence tool** that happens to have beautiful visual output.

**Target Users**: Azure architects, cloud engineering leads, pre-sales consultants

---

## Core Principles

### I. Clean Architecture with CQRS (Backend)

All backend code MUST follow Clean Architecture with CQRS pattern:

```
Dependencies flow INWARD only:
Presentation → Application → Domain ← Infrastructure
```

| Layer | Responsibility | Dependencies |
|-------|---------------|--------------|
| **Domain** | Entities, value objects, config POCOs, enums | NONE (zero external) |
| **Application** | Use cases, CQRS handlers, validators, interfaces | Domain only |
| **Infrastructure** | MCP servers, Azure SDK, AI implementations | Application interfaces |
| **Presentation** | AG-UI endpoint, API controllers | Application |

### II. One Class/Component Per File (NON-NEGOTIABLE)

- Every class, interface, record, enum, or React component MUST be in its own file
- File name MUST match type/component name exactly
- Namespace/import paths MUST match folder structure
- NO exceptions - this enables discoverability and maintainability

### III. Test-First Development (NON-NEGOTIABLE)

TDD is mandatory for all features:

1. Write tests FIRST (RED)
2. Run tests - they MUST fail
3. Implement minimal code to pass (GREEN)
4. Refactor while keeping tests green (IMPROVE)
5. Verify 80%+ code coverage before PR approval

**Backend Tests**: xUnit + Moq + FluentAssertions
**Frontend Tests**: Vitest + React Testing Library + Playwright (E2E)

### IV. Security-First

- NO hardcoded secrets - use Azure Key Vault or environment variables
- ALL user inputs validated (backend: FluentValidation, frontend: Zod)
- HTTPS enforced in all environments
- Azure RBAC for resource access
- MSAL for user authentication (Microsoft Entra ID)

### V. Azure Well-Architected Alignment

All generated architectures MUST validate against the five WAF pillars:

| Pillar | Validation |
|--------|------------|
| **Reliability** | Redundancy, failover, disaster recovery |
| **Security** | Identity, network isolation, encryption |
| **Cost Optimization** | Right-sizing, reserved instances, spend alerts |
| **Operational Excellence** | Monitoring, automation, IaC |
| **Performance Efficiency** | Scaling, caching, latency optimization |

### VI. Simplicity (YAGNI)

- Start with the simplest solution that works
- NO speculative features - build only what's needed now
- NO premature abstractions - three similar patterns before extracting
- Delete unused code immediately

### VII. Structured Logging

All logging MUST use structured parameters:

```csharp
// C# Backend - CORRECT
_logger.LogInformation("Processing diagram {DiagramId} for user {UserId}", diagramId, userId);

// TypeScript Frontend - CORRECT
console.info('Processing diagram', { diagramId, userId });
```

---

## Project Structure

```
azurecraft/
├── apps/
│   └── web/                              # Next.js frontend
│       ├── app/
│       │   ├── page.tsx                  # Main canvas page
│       │   ├── layout.tsx                # Root layout with providers
│       │   └── api/copilotkit/           # AG-UI proxy route
│       ├── components/
│       │   ├── canvas/                   # React Flow components
│       │   │   ├── AzureCanvas.tsx
│       │   │   ├── nodes/                # Custom node types
│       │   │   ├── edges/                # Custom edge types
│       │   │   ├── groups/               # Resource group boundaries
│       │   │   └── controls/             # Palette, zoom, view modes
│       │   ├── panels/                   # Property panels
│       │   ├── chat/                     # CopilotKit sidebar
│       │   └── ui/                       # shadcn/ui components
│       ├── lib/
│       │   ├── azure-icons/              # 705 Azure SVG icons
│       │   ├── state/                    # Shared state types
│       │   ├── layout/                   # Dagre/ELK layout
│       │   └── export/                   # PNG/SVG/Bicep export
│       └── styles/
│
├── backend/                              # ASP.NET Core AG-UI backend
│   ├── src/
│   │   ├── Domain/
│   │   │   ├── Domain.Common/            # Config, enums, POCOs
│   │   │   └── Domain.Core/              # Diagram entities
│   │   ├── Application/
│   │   │   ├── Application.Common/       # DTOs, exceptions, behaviors
│   │   │   └── Application.Core/         # CQRS handlers, services
│   │   ├── Infrastructure/
│   │   │   ├── Infrastructure.AI/        # Agent implementations
│   │   │   ├── Infrastructure.Azure/     # Azure SDK integrations
│   │   │   └── Infrastructure.MCP/       # MCP client connections
│   │   └── Presentation/
│   │       └── Presentation.API/         # AG-UI endpoint, controllers
│   └── tests/
│       ├── Testing.Domain.UnitTests/
│       ├── Testing.Application.UnitTests/
│       └── Testing.Infrastructure.UnitTests/
│
├── mcp-servers/                          # MCP tool servers (C#)
│   ├── AzureCraft.MCP.ResourceGraph/     # Azure Resource Graph queries
│   ├── AzureCraft.MCP.Pricing/           # Azure Pricing API
│   ├── AzureCraft.MCP.Storage/           # Diagram persistence
│   └── AzureCraft.MCP.Docs/              # Azure docs RAG search
│
└── docs/
    ├── architecture.md
    └── service-catalog.md
```

---

## Technology Stack

### Frontend (Next.js)

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js (App Router) | 15+ |
| Canvas | @xyflow/react (React Flow) | 12+ |
| Agent UI | CopilotKit | Latest |
| Styling | Tailwind CSS + shadcn/ui | Latest |
| Animation | Framer Motion | Latest |
| State | React hooks + CopilotKit shared state | - |
| Validation | Zod | Latest |
| Testing | Vitest + React Testing Library | Latest |
| E2E Testing | Playwright | Latest |

### Backend (ASP.NET Core)

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | .NET 9+ | Latest LTS |
| Framework | ASP.NET Core | 9.0+ |
| Agent Framework | Microsoft.Agents | Latest |
| AI | Microsoft.Extensions.AI + Azure.AI.OpenAI | Latest |
| CQRS | MediatR | 14.0+ |
| Validation | FluentValidation | 12.0+ |
| Mapping | AutoMapper | 16.0+ |
| Guard Clauses | Ardalis.GuardClauses | 5.0+ |
| MCP | ModelContextProtocol | Latest |

### Azure Services

| Component | Service |
|-----------|---------|
| AI Model | Azure OpenAI (GPT-4.1 / GPT-4o) |
| Auth | Microsoft Entra ID (MSAL) |
| Storage | Azure Cosmos DB / Blob Storage |
| Monitoring | Application Insights |
| Key Management | Azure Key Vault |

---

## Frontend Architecture

### React Flow Canvas Setup

```typescript
// components/canvas/AzureCanvas.tsx
'use client';

import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ComputeNode } from './nodes/ComputeNode';
import { DatabaseNode } from './nodes/DatabaseNode';
import { NetworkNode } from './nodes/NetworkNode';
import { ResourceGroupNode } from './groups/ResourceGroupNode';
import { AnimatedEdge } from './edges/AnimatedEdge';

const nodeTypes = {
  compute: ComputeNode,
  database: DatabaseNode,
  network: NetworkNode,
  resourceGroup: ResourceGroupNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
};

export function AzureCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}
```

### Custom Azure Node Pattern

```typescript
// components/canvas/nodes/ComputeNode.tsx
import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { AzureIcon } from '@/components/ui/AzureIcon';
import { CostBadge } from '@/components/ui/CostBadge';
import { StatusDot } from '@/components/ui/StatusDot';
import type { AzureNodeData } from '@/lib/state/types';

export const ComputeNode = memo(({ data, selected }: NodeProps<AzureNodeData>) => {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-3 shadow-sm transition-all',
        selected && 'ring-2 ring-primary'
      )}
    >
      <Handle type="target" position={Position.Top} />

      <div className="flex items-start gap-3">
        <AzureIcon serviceType={data.serviceType} className="h-10 w-10" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{data.displayName}</span>
            <StatusDot status={data.status} />
          </div>
          {data.sku && (
            <span className="text-xs text-muted-foreground">{data.sku}</span>
          )}
        </div>
        {data.monthlyCost && <CostBadge cost={data.monthlyCost} />}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

ComputeNode.displayName = 'ComputeNode';
```

### CopilotKit Shared State

```typescript
// lib/state/types.ts
export interface DiagramState {
  // Canvas state
  nodes: AzureNode[];
  edges: AzureEdge[];
  groups: ResourceGroupBoundary[];

  // UI state
  selectedNodeId: string | null;
  viewMode: '2d' | 'isometric' | 'cost-heatmap' | 'compliance';

  // Agent-computed
  costSummary: CostSummary;
  validationResults: ArchReviewFinding[];
  suggestedOptimizations: Optimization[];

  // Metadata
  diagramId?: string;
  diagramName: string;
  version: number;
}

export interface AzureNodeData {
  serviceType: AzureServiceType;
  displayName: string;
  resourceId?: string;
  sku?: string;
  region?: string;
  monthlyCost?: number;
  status?: 'healthy' | 'warning' | 'error' | 'proposed';
  properties: Record<string, unknown>;
  category: AzureServiceCategory;
}
```

```typescript
// app/layout.tsx
import { CopilotKit } from '@copilotkit/react-core';
import { CopilotSidebar } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CopilotKit runtimeUrl="/api/copilotkit">
          <CopilotSidebar>
            {children}
          </CopilotSidebar>
        </CopilotKit>
      </body>
    </html>
  );
}
```

```typescript
// components/canvas/AzureCanvasWithAgent.tsx
'use client';

import { useCoAgent } from '@copilotkit/react-core';
import { AzureCanvas } from './AzureCanvas';
import type { DiagramState } from '@/lib/state/types';

const initialState: DiagramState = {
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
};

export function AzureCanvasWithAgent() {
  const { state, setState } = useCoAgent<DiagramState>({
    name: 'azure_architect',
    initialState,
  });

  return (
    <AzureCanvas
      nodes={state.nodes}
      edges={state.edges}
      onNodesChange={(changes) => {
        // Update shared state
      }}
    />
  );
}
```

### React Component Conventions

1. **File naming**: `PascalCase.tsx` for components, `camelCase.ts` for utilities
2. **Export pattern**: Named exports preferred, default export only for pages
3. **Props interface**: Define above component, suffix with `Props`
4. **Memo**: Use `memo()` for canvas nodes to prevent re-renders
5. **Hooks**: Custom hooks in `hooks/` folder, prefix with `use`

```typescript
// CORRECT component structure
interface ComputeNodeProps {
  data: AzureNodeData;
  selected: boolean;
}

export const ComputeNode = memo(function ComputeNode({ data, selected }: ComputeNodeProps) {
  // Component logic
});
```

---

## Backend Architecture

### AG-UI Endpoint Setup

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Register layers
builder.Services.AddApplicationCommonDependencies(appConfig);
builder.Services.AddApplicationCoreDependencies(appConfig);
builder.Services.AddInfrastructureAI(appConfig);
builder.Services.AddInfrastructureMCP(appConfig);

// Register MCP clients
builder.Services.AddMcpClient("azure-resource-graph", "http://localhost:5010");
builder.Services.AddMcpClient("azure-pricing", "http://localhost:5011");
builder.Services.AddMcpClient("diagram-storage", "http://localhost:5012");

var app = builder.Build();

// Map AG-UI endpoint for CopilotKit
app.MapAGUI("/api/copilotkit", architectAgent);
app.Run();
```

### Agent Implementation

```csharp
// Infrastructure.AI/Agents/ArchitectAgent.cs
public class ArchitectAgent : IAgent
{
    #region Variables
    private readonly ILogger<ArchitectAgent> _logger;
    private readonly IChatClient _chatClient;
    private readonly IMcpClientFactory _mcpFactory;
    #endregion

    #region Constructor
    public ArchitectAgent(
        ILogger<ArchitectAgent> logger,
        IChatClient chatClient,
        IMcpClientFactory mcpFactory)
    {
        Guard.Against.Null(logger, nameof(logger));
        Guard.Against.Null(chatClient, nameof(chatClient));
        Guard.Against.Null(mcpFactory, nameof(mcpFactory));

        _logger = logger;
        _chatClient = chatClient;
        _mcpFactory = mcpFactory;
    }
    #endregion

    #region Public Methods
    /// <summary>
    /// Process a user message and return agent response.
    /// </summary>
    public async Task<AgentResponse> ProcessAsync(
        AgentRequest request,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Processing request for diagram {DiagramId}", request.DiagramId);

        // Agent logic here
    }
    #endregion
}
```

### MCP Server Pattern

```csharp
// AzureCraft.MCP.Pricing/PricingMcpServer.cs
public class PricingMcpServer : McpServerBase
{
    #region Variables
    private readonly ILogger<PricingMcpServer> _logger;
    private readonly HttpClient _httpClient;
    #endregion

    #region Constructor
    public PricingMcpServer(
        ILogger<PricingMcpServer> logger,
        HttpClient httpClient)
    {
        Guard.Against.Null(logger, nameof(logger));
        Guard.Against.Null(httpClient, nameof(httpClient));

        _logger = logger;
        _httpClient = httpClient;
    }
    #endregion

    #region Tools
    /// <summary>
    /// Get price for a specific Azure SKU.
    /// </summary>
    [McpTool("get_price")]
    public async Task<PriceResult> GetPriceAsync(
        string serviceName,
        string skuName,
        string region,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Getting price for {Service} {Sku} in {Region}",
            serviceName, skuName, region);

        var url = $"https://prices.azure.com/api/retail/prices?$filter=serviceName eq '{serviceName}' and skuName eq '{skuName}' and armRegionName eq '{region}'";

        var response = await _httpClient.GetFromJsonAsync<AzurePriceResponse>(url, cancellationToken);

        return new PriceResult
        {
            ServiceName = serviceName,
            SkuName = skuName,
            Region = region,
            UnitPrice = response?.Items?.FirstOrDefault()?.UnitPrice ?? 0,
            Currency = "USD"
        };
    }

    /// <summary>
    /// Estimate monthly cost for multiple resources.
    /// </summary>
    [McpTool("estimate_monthly")]
    public async Task<MonthlyEstimate> EstimateMonthlyAsync(
        ResourceEstimateRequest[] resources,
        CancellationToken cancellationToken = default)
    {
        // Implementation
    }
    #endregion
}
```

### Backend Code Conventions

All backend code follows the same patterns from ApplicationTemplate:

1. **Mandatory Regions**: Variables → Properties → Constructor → Public Methods → Private Methods
2. **Guard Clauses**: First in constructors
3. **XML Documentation**: Required on all public members
4. **CancellationToken**: Always accept and propagate
5. **Structured Logging**: Named parameters, no interpolation
6. **One Class Per File**: Always

---

## Testing Approach

### Frontend Testing (Vitest + RTL)

```typescript
// components/canvas/nodes/ComputeNode.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ComputeNode } from './ComputeNode';

describe('ComputeNode', () => {
  const mockData: AzureNodeData = {
    serviceType: 'app-service',
    displayName: 'My App Service',
    sku: 'P1v3',
    monthlyCost: 150,
    status: 'healthy',
    category: 'compute',
    properties: {},
  };

  it('renders service name', () => {
    render(<ComputeNode data={mockData} selected={false} />);
    expect(screen.getByText('My App Service')).toBeInTheDocument();
  });

  it('renders SKU badge', () => {
    render(<ComputeNode data={mockData} selected={false} />);
    expect(screen.getByText('P1v3')).toBeInTheDocument();
  });

  it('shows selection ring when selected', () => {
    const { container } = render(<ComputeNode data={mockData} selected={true} />);
    expect(container.firstChild).toHaveClass('ring-2');
  });
});
```

### Backend Testing (xUnit + Moq)

```csharp
// Testing.Application.UnitTests/Agents/ArchitectAgentTests.cs
public class ArchitectAgentTests : IDisposable
{
    #region Variables
    private readonly Mock<ILogger<ArchitectAgent>> _mockLogger;
    private readonly Mock<IChatClient> _mockChatClient;
    private readonly Mock<IMcpClientFactory> _mockMcpFactory;
    private readonly ArchitectAgent _agent;
    #endregion

    #region Constructor
    public ArchitectAgentTests()
    {
        _mockLogger = new Mock<ILogger<ArchitectAgent>>();
        _mockChatClient = new Mock<IChatClient>();
        _mockMcpFactory = new Mock<IMcpClientFactory>();

        _agent = new ArchitectAgent(
            _mockLogger.Object,
            _mockChatClient.Object,
            _mockMcpFactory.Object);
    }
    #endregion

    #region ProcessAsync Tests
    [Fact]
    public async Task ProcessAsync_WithValidRequest_ReturnsResponse()
    {
        // Arrange
        var request = new AgentRequest { DiagramId = Guid.NewGuid().ToString() };

        // Act
        var result = await _agent.ProcessAsync(request);

        // Assert
        result.Should().NotBeNull();
    }
    #endregion

    #region IDisposable
    public void Dispose() { }
    #endregion
}
```

---

## Anti-Patterns (NEVER DO)

| Anti-Pattern | Why It's Bad | Do This Instead |
|--------------|--------------|-----------------|
| Multiple classes/components in one file | Hard to find | One per file, always |
| Missing Guard.Against clauses (C#) | Null reference exceptions | Guard first in constructors |
| String interpolation in logging | Breaks structured logging | Use named parameters |
| `any` type in TypeScript | Defeats type safety | Use proper types or `unknown` |
| Inline styles in React | Hard to maintain | Use Tailwind classes |
| Direct DOM manipulation | Breaks React model | Use refs or state |
| Prop drilling > 2 levels | Coupling | Use context or state management |
| console.log in production | Security risk | Use proper logging |
| Missing CancellationToken (C#) | Can't cancel operations | Always propagate |

---

## Development Workflow

### Feature Development

1. **Specify**: Write spec using `/speckit.specify`
2. **Plan**: Break down with `/speckit.plan`
3. **Test**: Write failing tests first (RED)
4. **Implement**: Minimal code to pass tests (GREEN)
5. **Refactor**: Improve while keeping tests green
6. **Review**: Code review required

### Git Workflow

- Feature branches from `main`
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
- PR requires: passing CI, code review, 80%+ coverage
- Squash merge to `main`

### Quality Gates

**Frontend:**
- [ ] `npm run build` passes
- [ ] `npm run test` passes (80%+ coverage)
- [ ] `npm run lint` passes
- [ ] No TypeScript errors
- [ ] No `any` types
- [ ] Playwright E2E tests pass

**Backend:**
- [ ] `dotnet build` passes
- [ ] `dotnet test` passes (80%+ coverage)
- [ ] No build warnings
- [ ] XML docs on public members
- [ ] Guard clauses in constructors

---

## Governance

This constitution supersedes all other development practices for AzureCraft.

### Amendments

1. Propose change via PR to this file
2. Document rationale and migration impact
3. Require approval from project lead
4. Update dependent templates and docs
5. Increment version per semantic versioning

### Compliance

- All PRs MUST verify compliance with these principles
- Violations MUST be flagged in code review
- Exceptions require documented justification

**Version**: 3.0.0 | **Ratified**: 2026-02-05 | **Last Amended**: 2026-02-05
