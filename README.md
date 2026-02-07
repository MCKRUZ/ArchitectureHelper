# AzureCraft

AI-powered Azure architecture design tool with real-time cost estimation and Well-Architected Framework validation.

## Project Structure

```
AzureCraft/
├── apps/
│   └── web/                    # Next.js frontend
│       ├── app/                # App Router pages
│       ├── components/         # React components
│       │   ├── canvas/         # React Flow canvas
│       │   ├── palette/        # Service palette
│       │   ├── properties/     # Properties panel
│       │   ├── providers/      # Context providers
│       │   └── toolbar/        # Toolbar components
│       └── lib/                # Utilities and state
│           └── state/          # CopilotKit shared state
├── backend/                    # .NET backend
│   ├── src/
│   │   ├── AzureCraft.Api/          # ASP.NET Core API
│   │   ├── AzureCraft.Application/  # CQRS commands/queries
│   │   ├── AzureCraft.Domain/       # Domain entities
│   │   └── AzureCraft.Infrastructure/ # EF Core, external services
│   └── tests/
│       ├── AzureCraft.Domain.Tests/
│       └── AzureCraft.Application.Tests/
├── mcp-servers/                # MCP servers (placeholder)
└── docs/                       # Documentation
```

## Tech Stack

### Frontend
- **Next.js 15** with App Router
- **React Flow** (@xyflow/react) for canvas
- **CopilotKit** for AI agent integration
- **Tailwind CSS** + shadcn/ui
- **TypeScript**

### Backend
- **.NET 9** with ASP.NET Core
- **Clean Architecture** with CQRS (MediatR)
- **Entity Framework Core** for persistence
- **FluentValidation** for validation

### AI/ML
- **Azure OpenAI** (GPT-4) for LLM
- **CopilotKit** AG-UI protocol for shared state

## Getting Started

### Prerequisites
- Node.js 20+
- .NET 9 SDK
- pnpm (recommended) or npm

### Frontend Setup

```bash
cd apps/web
pnpm install
pnpm dev
```

Open http://localhost:3000

### Backend Setup

```bash
cd backend
dotnet restore
dotnet run --project src/AzureCraft.Api
```

API runs at https://localhost:7001

### Run Tests

```bash
# Frontend
cd apps/web
pnpm test

# Backend
cd backend
dotnet test
```

## Architecture

### Canvas (React Flow)
- Custom `GenericAzureNode` for all service types
- Drag-and-drop from `ServicePalette`
- `PropertiesPanel` for editing selected nodes
- Shared state via CopilotKit `useCoAgent`

### State Management
- CopilotKit shared state between UI and AI agent
- `DiagramState` includes nodes, edges, cost summary, validation results
- Real-time sync via AG-UI protocol (SSE)

### Backend (Clean Architecture)
- **Domain**: Entities, value objects, domain logic
- **Application**: CQRS commands/queries, interfaces
- **Infrastructure**: EF Core, external services
- **API**: Controllers, middleware

## MVP Scope

Phase 1 focuses on:
1. Canvas with drag-and-drop Azure services
2. Node properties editing
3. Edge connections between services
4. Basic cost estimation (static pricing)
5. Export/import diagrams as JSON

## License

MIT
