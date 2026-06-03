namespace AzureCraft.Application.Bicep.Dtos;

/// <summary>
/// Full diagram export payload sent from the frontend for Bicep generation or deployment.
/// </summary>
public sealed record DiagramExportDto(
    string DiagramName,
    IReadOnlyList<ExportNodeDto> Nodes,
    IReadOnlyList<ExportEdgeDto> Edges,
    string? Region);

/// <summary>
/// A single node in the exported diagram, representing an Azure service or group.
/// </summary>
public sealed record ExportNodeDto(
    string Id,
    string ServiceType,
    string DisplayName,
    string? Sku,
    string? Region,
    string? Description,
    string? LogicalParent,
    string? GroupType,
    string? Subtitle,
    Dictionary<string, object>? Properties);

/// <summary>
/// A single edge (connection) in the exported diagram.
/// </summary>
public sealed record ExportEdgeDto(
    string Id,
    string Source,
    string Target,
    string? ConnectionType);
