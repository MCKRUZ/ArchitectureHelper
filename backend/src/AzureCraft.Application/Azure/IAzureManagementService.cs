namespace AzureCraft.Application.Azure;

/// <summary>
/// Provides access to Azure subscription and resource group management.
/// </summary>
public interface IAzureManagementService
{
    /// <summary>List all subscriptions the authenticated user has access to.</summary>
    Task<IReadOnlyList<SubscriptionDto>> ListSubscriptionsAsync(
        string accessToken, CancellationToken cancellationToken = default);

    /// <summary>List resource groups in a subscription.</summary>
    Task<IReadOnlyList<ResourceGroupDto>> ListResourceGroupsAsync(
        string accessToken, string subscriptionId, CancellationToken cancellationToken = default);
}

public sealed record SubscriptionDto(
    string SubscriptionId,
    string DisplayName,
    string State);

public sealed record ResourceGroupDto(
    string Name,
    string Location,
    string? ProvisioningState);
