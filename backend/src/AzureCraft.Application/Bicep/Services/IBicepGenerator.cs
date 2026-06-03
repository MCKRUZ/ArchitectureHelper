using AzureCraft.Application.Bicep.Dtos;

namespace AzureCraft.Application.Bicep.Services;

/// <summary>
/// Generates Bicep files from a diagram export.
/// </summary>
public interface IBicepGenerator
{
    /// <summary>
    /// Generate a set of Bicep files for the given diagram.
    /// </summary>
    Task<BicepGenerationResult> GenerateAsync(
        DiagramExportDto diagram,
        CancellationToken cancellationToken = default);
}
