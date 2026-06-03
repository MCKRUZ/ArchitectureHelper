using MediatR;
using Microsoft.Extensions.Logging;

namespace AzureCraft.Application.Deploy.Commands.DeployDiagram;

public sealed class DeployDiagramCommandHandler(
    IDeploymentService deploymentService,
    ILogger<DeployDiagramCommandHandler> logger)
    : IRequestHandler<DeployDiagramCommand, DeploymentResult>
{
    public async Task<DeploymentResult> Handle(
        DeployDiagramCommand request,
        CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Deploying diagram '{DiagramName}' to subscription {SubscriptionId}, RG {ResourceGroup}",
            request.Diagram.DiagramName,
            request.SubscriptionId,
            request.ResourceGroupName);

        var result = await deploymentService.DeployAsync(
            request.AccessToken,
            request.SubscriptionId,
            request.ResourceGroupName,
            request.Region,
            request.Diagram,
            cancellationToken);

        logger.LogInformation(
            "Deployment {DeploymentName} started with state {State}",
            result.DeploymentName,
            result.ProvisioningState);

        return result;
    }
}
