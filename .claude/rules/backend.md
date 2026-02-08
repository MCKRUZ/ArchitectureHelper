---
paths: backend/**/*.cs
---
# Backend Rules (.NET Clean Architecture)
- Follow Clean Architecture layers strictly: Domain has zero dependencies on other layers.
- All commands/queries go through MediatR. Controllers are thin — validate, dispatch, return.
- Use FluentValidation for all command validation (never validate in handlers directly).
- Record types for DTOs and value objects. Class types for entities with identity.
- Async all the way — never use `.Result`, `.Wait()`, or `Task.Run()` for async wrapping.
- Always pass `CancellationToken` through the call chain.
- Use `IOptions<T>` pattern for configuration. Never read `IConfiguration` directly in services.
- EF Core: Use `AsNoTracking()` for read queries. Include explicit `Include()` calls — no lazy loading.
- All public API endpoints must have XML doc comments for Swagger/OpenAPI generation.
