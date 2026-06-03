using AzureCraft.Application.Bicep.Dtos;
using MediatR;

namespace AzureCraft.Application.Bicep.Commands.GenerateBicep;

/// <summary>
/// Command to generate Bicep files from a diagram export.
/// </summary>
public sealed record GenerateBicepCommand(
    DiagramExportDto Diagram,
    string Format) : IRequest<BicepGenerationResult>;
