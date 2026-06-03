using AzureCraft.Application.Bicep.Dtos;
using MediatR;

namespace AzureCraft.Application.Deploy.Commands.DeployDiagram;

/// <summary>
/// Command to deploy a diagram's infrastructure to Azure.
/// </summary>
public sealed record DeployDiagramCommand(
    string AccessToken,
    string SubscriptionId,
    string ResourceGroupName,
    string Region,
    DiagramExportDto Diagram) : IRequest<DeploymentResult>;
