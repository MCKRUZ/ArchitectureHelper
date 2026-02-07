using MediatR;

namespace AzureCraft.Application.Diagrams.Queries.GetDiagram;

/// <summary>
/// Query to get a diagram by ID.
/// </summary>
public sealed record GetDiagramQuery(Guid Id) : IRequest<DiagramDto?>;

/// <summary>
/// Diagram data transfer object.
/// </summary>
public sealed record DiagramDto(
    Guid Id,
    string Name,
    string? Description,
    DateTime CreatedAt,
    DateTime ModifiedAt,
    int Version,
    IReadOnlyList<NodeDto> Nodes,
    IReadOnlyList<EdgeDto> Edges);

/// <summary>
/// Node data transfer object.
/// </summary>
public sealed record NodeDto(
    Guid Id,
    string ServiceType,
    string DisplayName,
    double X,
    double Y,
    string? Sku,
    string? Region,
    decimal MonthlyCost,
    string Status);

/// <summary>
/// Edge data transfer object.
/// </summary>
public sealed record EdgeDto(
    Guid Id,
    Guid SourceNodeId,
    Guid TargetNodeId,
    string ConnectionType,
    bool IsEncrypted,
    string? Label);
