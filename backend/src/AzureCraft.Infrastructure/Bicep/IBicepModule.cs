using AzureCraft.Application.Bicep.Dtos;

namespace AzureCraft.Infrastructure.Bicep;

/// <summary>
/// Generates a Bicep module for a specific Azure service type.
/// </summary>
public interface IBicepModule
{
    /// <summary>
    /// The kebab-case service type this module handles (e.g. "app-service").
    /// </summary>
    string ServiceType { get; }

    /// <summary>
    /// Generate Bicep content for the given node within the template context.
    /// </summary>
    string Generate(ExportNodeDto node, BicepTemplateContext ctx);
}

/// <summary>
/// Shared context available to all Bicep modules during generation.
/// </summary>
public sealed class BicepTemplateContext
{
    public required string DiagramName { get; init; }
    public required string Region { get; init; }
    public required IReadOnlyList<ExportNodeDto> AllNodes { get; init; }
    public required IReadOnlyList<ExportEdgeDto> AllEdges { get; init; }

    /// <summary>
    /// Resource name generated from the diagram name (lowercase, no spaces).
    /// Used as a prefix for resource names to ensure uniqueness.
    /// </summary>
    public required string ResourcePrefix { get; init; }

    /// <summary>
    /// Whether a Log Analytics workspace exists in the diagram (for diagnostic settings).
    /// </summary>
    public bool HasLogAnalytics =>
        AllNodes.Any(n => n.ServiceType == "log-analytics");

    /// <summary>
    /// Whether a VNet exists in the diagram.
    /// </summary>
    public bool HasVNet =>
        AllNodes.Any(n => n.ServiceType == "virtual-network");

    /// <summary>
    /// Get all edges where the given node is the source or target.
    /// </summary>
    public IEnumerable<ExportEdgeDto> GetEdgesFor(string nodeId) =>
        AllEdges.Where(e => e.Source == nodeId || e.Target == nodeId);

    /// <summary>
    /// Get all edges of a specific connection type involving this node.
    /// </summary>
    public IEnumerable<ExportEdgeDto> GetEdgesOfType(string nodeId, string connectionType) =>
        GetEdgesFor(nodeId).Where(e =>
            string.Equals(e.ConnectionType, connectionType, StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// Check if a node has any private endpoint connections.
    /// </summary>
    public bool HasPrivateEndpoint(string nodeId) =>
        GetEdgesOfType(nodeId, "private-endpoint").Any();
}
