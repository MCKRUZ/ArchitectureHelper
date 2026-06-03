using AzureCraft.Application.Bicep.Dtos;
using AzureCraft.Application.Bicep.Services;
using MediatR;
using Microsoft.Extensions.Logging;

namespace AzureCraft.Application.Bicep.Commands.GenerateBicep;

/// <summary>
/// Handles Bicep generation by delegating to the IBicepGenerator.
/// </summary>
public sealed class GenerateBicepCommandHandler(
    IBicepGenerator generator,
    ILogger<GenerateBicepCommandHandler> logger)
    : IRequestHandler<GenerateBicepCommand, BicepGenerationResult>
{
    public async Task<BicepGenerationResult> Handle(
        GenerateBicepCommand request,
        CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Generating Bicep for diagram '{DiagramName}' ({NodeCount} nodes, {EdgeCount} edges, format={Format})",
            request.Diagram.DiagramName,
            request.Diagram.Nodes.Count,
            request.Diagram.Edges.Count,
            request.Format);

        var result = await generator.GenerateAsync(request.Diagram, cancellationToken);

        logger.LogInformation(
            "Generated {FileCount} Bicep files for '{DiagramName}'",
            result.Files.Count,
            request.Diagram.DiagramName);

        return result;
    }
}
