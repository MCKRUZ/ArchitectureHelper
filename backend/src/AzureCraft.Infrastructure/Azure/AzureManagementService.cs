using Azure.Core;
using Azure.ResourceManager;
using AzureCraft.Application.Azure;
using Microsoft.Extensions.Logging;

namespace AzureCraft.Infrastructure.Azure;

/// <summary>
/// Implements Azure subscription/resource group browsing using the user's access token.
/// </summary>
public sealed class AzureManagementService(ILogger<AzureManagementService> logger)
    : IAzureManagementService
{
    public async Task<IReadOnlyList<SubscriptionDto>> ListSubscriptionsAsync(
        string accessToken, CancellationToken cancellationToken = default)
    {
        var client = CreateClient(accessToken);
        var subscriptions = new List<SubscriptionDto>();

        await foreach (var sub in client.GetSubscriptions()
            .GetAllAsync(cancellationToken))
        {
            subscriptions.Add(new SubscriptionDto(
                sub.Data.SubscriptionId,
                sub.Data.DisplayName,
                sub.Data.State?.ToString() ?? "Unknown"));
        }

        logger.LogInformation("Listed {Count} subscriptions", subscriptions.Count);
        return subscriptions;
    }

    public async Task<IReadOnlyList<ResourceGroupDto>> ListResourceGroupsAsync(
        string accessToken, string subscriptionId, CancellationToken cancellationToken = default)
    {
        var client = CreateClient(accessToken);
        var sub = client.GetSubscriptionResource(
            new ResourceIdentifier($"/subscriptions/{subscriptionId}"));
        var groups = new List<ResourceGroupDto>();

        await foreach (var rg in sub.GetResourceGroups()
            .GetAllAsync(cancellationToken: cancellationToken))
        {
            groups.Add(new ResourceGroupDto(
                rg.Data.Name,
                rg.Data.Location.DisplayName ?? rg.Data.Location.Name,
                "Succeeded"));
        }

        logger.LogInformation(
            "Listed {Count} resource groups in subscription {SubscriptionId}",
            groups.Count, subscriptionId);
        return groups;
    }

    private static ArmClient CreateClient(string accessToken) =>
        new(new StaticTokenCredential(accessToken));
}

/// <summary>
/// A simple TokenCredential that returns a pre-acquired access token.
/// Used to pass the user's MSAL token to the Azure SDK.
/// </summary>
internal sealed class StaticTokenCredential(string token) : TokenCredential
{
    public override AccessToken GetToken(TokenRequestContext requestContext, CancellationToken cancellationToken) =>
        new(token, DateTimeOffset.UtcNow.AddMinutes(30));

    public override ValueTask<AccessToken> GetTokenAsync(
        TokenRequestContext requestContext, CancellationToken cancellationToken) =>
        ValueTask.FromResult(GetToken(requestContext, cancellationToken));
}
