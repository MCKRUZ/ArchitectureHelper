namespace AzureCraft.Application.Bicep.Dtos;

/// <summary>
/// Result of Bicep generation: a list of files and optional zip bytes.
/// </summary>
public sealed record BicepGenerationResult(
    IReadOnlyList<BicepFileDto> Files,
    byte[]? ZipBytes);

/// <summary>
/// A single generated Bicep file with its relative path and content.
/// </summary>
public sealed record BicepFileDto(
    string Path,
    string Content);
