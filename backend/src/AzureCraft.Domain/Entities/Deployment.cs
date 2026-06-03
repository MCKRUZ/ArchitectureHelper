using Ardalis.GuardClauses;

namespace AzureCraft.Domain.Entities;

/// <summary>
/// Tracks a deployment of a diagram to Azure.
/// </summary>
public class Deployment
{
    public Guid Id { get; private set; }
    public Guid? DiagramId { get; private set; }
    public string DiagramName { get; private set; }
    public string DeploymentName { get; private set; }
    public string SubscriptionId { get; private set; }
    public string ResourceGroupName { get; private set; }
    public string Region { get; private set; }
    public DeploymentStatus Status { get; private set; }
    public string? ErrorMessage { get; private set; }
    public string? PortalUrl { get; private set; }
    public int ResourceCount { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }

    #pragma warning disable CS8618 // EF Core requires a parameterless constructor
    private Deployment() { }
    #pragma warning restore CS8618

    public Deployment(
        string diagramName,
        string deploymentName,
        string subscriptionId,
        string resourceGroupName,
        string region,
        int resourceCount,
        string? portalUrl,
        Guid? diagramId = null)
    {
        Id = Guid.NewGuid();
        DiagramName = Guard.Against.NullOrWhiteSpace(diagramName);
        DeploymentName = Guard.Against.NullOrWhiteSpace(deploymentName);
        SubscriptionId = Guard.Against.NullOrWhiteSpace(subscriptionId);
        ResourceGroupName = Guard.Against.NullOrWhiteSpace(resourceGroupName);
        Region = Guard.Against.NullOrWhiteSpace(region);
        ResourceCount = resourceCount;
        PortalUrl = portalUrl;
        DiagramId = diagramId;
        Status = DeploymentStatus.Running;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public void MarkSucceeded()
    {
        Status = DeploymentStatus.Succeeded;
        CompletedAt = DateTimeOffset.UtcNow;
    }

    public void MarkFailed(string? errorMessage)
    {
        Status = DeploymentStatus.Failed;
        ErrorMessage = errorMessage;
        CompletedAt = DateTimeOffset.UtcNow;
    }

    public void MarkCanceled()
    {
        Status = DeploymentStatus.Canceled;
        CompletedAt = DateTimeOffset.UtcNow;
    }
}

public enum DeploymentStatus
{
    Running,
    Succeeded,
    Failed,
    Canceled,
}
