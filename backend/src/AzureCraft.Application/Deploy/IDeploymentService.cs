using AzureCraft.Application.Bicep.Dtos;

namespace AzureCraft.Application.Deploy;

/// <summary>
/// Deploys ARM JSON templates to Azure subscriptions.
/// </summary>
public interface IDeploymentService
{
    /// <summary>
    /// Deploy a diagram as ARM template to Azure.
    /// Returns a deployment ID for status tracking.
    /// </summary>
    Task<DeploymentResult> DeployAsync(
        string accessToken,
        string subscriptionId,
        string resourceGroupName,
        string region,
        DiagramExportDto diagram,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get the current status of a deployment.
    /// </summary>
    Task<DeploymentStatusSnapshot> GetStatusAsync(
        string accessToken,
        string subscriptionId,
        string resourceGroupName,
        string deploymentName,
        CancellationToken cancellationToken = default);
}

public sealed record DeploymentResult(
    string DeploymentId,
    string DeploymentName,
    string ProvisioningState,
    string? PortalUrl);

public sealed record DeploymentStatusSnapshot(
    string ProvisioningState,
    IReadOnlyList<DeploymentResourceStatus> Resources,
    string? ErrorMessage,
    DateTimeOffset Timestamp);

public sealed record DeploymentResourceStatus(
    string ResourceName,
    string ResourceType,
    string ProvisioningState,
    string? ErrorMessage);
