# AzureCraft — AI-Native Azure Infrastructure Designer

## Stack
Next.js 15 (App Router), React 19, React Flow (@xyflow/react v12), CopilotKit, Tailwind CSS + shadcn/ui, Framer Motion, TypeScript (strict) — frontend in `apps/web/`
.NET 9, ASP.NET Core, Clean Architecture (CQRS via MediatR), Entity Framework Core, FluentValidation — backend in `backend/`

## Architecture
Multi-layer: Next.js frontend with React Flow canvas and CopilotKit AI agent integration, .NET Clean Architecture backend (Domain → Application → Infrastructure → API). AG-UI protocol (SSE) connects frontend shared state to backend agents. MCP servers planned for Azure Resource Graph, Pricing API, diagram storage, and Azure Docs.

## Code Style

### Frontend (`apps/web/`)
- Strict TypeScript (`strict: true`). No `any` types.
- Functional components with hooks only. No class components.
- Server Components by default; add `"use client"` only when needed.
- Use `cn()` from `@/lib/utils` for conditional classNames.
- Zod for all input validation.
- Import paths use `@/*` alias (mapped to `apps/web/*`).
- React Flow custom nodes go in `components/canvas/`.
- CopilotKit shared state in `lib/state/`.

### Backend (`backend/`)
- Nullable reference types enabled. No suppression operators (`!`) without comment.
- Record types for DTOs and value objects.
- Async/await throughout; no `.Result` or `.Wait()`.
- All endpoints go through MediatR handlers — never put logic in controllers.
- FluentValidation for all command/query validation.
- Use `CancellationToken` in all async methods.

## Commands

### Frontend
- `cd apps/web && npm run dev` — Dev server (port 3000)
- `cd apps/web && npm run build` — Production build
- `cd apps/web && npm run lint` — ESLint
- `cd apps/web && npm test` — Vitest
- `cd apps/web && npx tsc --noEmit` — Type check

### Backend
- `cd backend && dotnet build` — Build all projects
- `cd backend && dotnet test` — Run all tests
- `cd backend && dotnet run --project src/AzureCraft.Api` — Run API (port 7001)

## Verification
After frontend changes: `cd apps/web && npm run build && npm test`
After backend changes: `cd backend && dotnet build && dotnet test`
After full-stack changes: run both.

## Key Patterns
- Canvas nodes are custom React Flow nodes in `components/canvas/` — use `GenericAzureNode` pattern.
- CopilotKit `useCoAgent` provides shared `DiagramState` (nodes, edges, cost, validation).
- AG-UI protocol streams events via SSE between frontend and .NET backend agents.
- Azure icons (705 SVGs) live in `lib/azure-icons/`.
- Auto-layout uses Dagre (`@dagrejs/dagre`) for graph positioning.

## Common Mistakes (Add as you find them)
- Don't import from `@xyflow/react` internals — use the public API only.
- Don't mutate React Flow node/edge arrays directly — use `setNodes`/`setEdges` with functional updates.
- Don't put `"use client"` on layout.tsx files.
- Don't use `DbContext` directly in controllers — go through MediatR handlers.
- Don't register Singleton services that depend on Scoped services in DI.

## Compact Instructions
When compacting, always preserve:
- Current task status and next steps
- React Flow canvas component architecture decisions
- CopilotKit/AG-UI integration patterns established
- Backend API endpoint contracts
- Any Azure service icon or node type mappings
