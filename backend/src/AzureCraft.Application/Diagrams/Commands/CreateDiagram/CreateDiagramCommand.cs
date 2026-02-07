using MediatR;

namespace AzureCraft.Application.Diagrams.Commands.CreateDiagram;

/// <summary>
/// Command to create a new diagram.
/// </summary>
public sealed record CreateDiagramCommand(
    string Name,
    string? Description = null) : IRequest<CreateDiagramResult>;

/// <summary>
/// Result of creating a diagram.
/// </summary>
public sealed record CreateDiagramResult(
    Guid Id,
    string Name,
    DateTime CreatedAt);
