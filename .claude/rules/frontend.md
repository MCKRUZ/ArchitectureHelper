---
paths: apps/web/**/*.ts, apps/web/**/*.tsx
---
# Frontend Rules (Next.js + React Flow + CopilotKit)
- Use `cn()` from `@/lib/utils` for all conditional className logic.
- Custom React Flow nodes must extend the `GenericAzureNode` pattern in `components/canvas/`.
- All React Flow state mutations must use functional updates: `setNodes(nds => ...)`.
- CopilotKit shared state changes go through `useCoAgent` hooks — never bypass the AG-UI protocol.
- Use `lucide-react` for UI icons. Azure service icons come from `lib/azure-icons/`.
- All new components get a TypeScript interface for their props (no inline anonymous types).
- Prefer `next/image` for static assets. Use raw `<img>` only for dynamically loaded Azure SVG icons.
- Zod schemas for any data crossing the client-server boundary (API routes, form inputs).
