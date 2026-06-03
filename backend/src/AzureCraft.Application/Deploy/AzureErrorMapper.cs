namespace AzureCraft.Application.Deploy;

/// <summary>
/// Maps Azure deployment error codes to user-friendly messages.
/// </summary>
public static class AzureErrorMapper
{
    private static readonly IReadOnlyDictionary<string, string> ErrorMappings =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["QuotaExceeded"] = "Subscription quota exceeded. Request a quota increase in the Azure Portal.",
            ["NameNotAvailable"] = "The resource name is already taken. Try a different name.",
            ["AuthorizationFailed"] = "Missing required permissions. Ensure you have Contributor role on this subscription.",
            ["InvalidTemplate"] = "The deployment template is invalid. This is likely a generation bug — please report it.",
            ["DeploymentFailed"] = "One or more resources failed to deploy. Check individual resource errors below.",
            ["ResourceGroupNotFound"] = "The specified resource group does not exist.",
            ["SubscriptionNotFound"] = "The specified subscription was not found or you don't have access.",
            ["LocationNotAvailableForResourceType"] = "The selected region doesn't support this resource type. Try a different region.",
            ["SkuNotAvailable"] = "The selected SKU is not available in this region. Try a different SKU or region.",
            ["RequestDisallowedByPolicy"] = "An Azure Policy is blocking this deployment. Contact your administrator.",
            ["InvalidResourceReference"] = "A resource reference is invalid. This is likely a generation bug.",
            ["Conflict"] = "A resource with this name already exists. Use a different name or delete the existing resource.",
            ["StorageAccountAlreadyTaken"] = "This storage account name is already taken globally. Storage names must be unique worldwide.",
        };

    /// <summary>
    /// Get a user-friendly message for an Azure error code.
    /// Returns the raw message if no mapping exists.
    /// </summary>
    public static string GetFriendlyMessage(string? errorCode, string? rawMessage)
    {
        if (errorCode is not null && ErrorMappings.TryGetValue(errorCode, out var friendly))
            return friendly;

        return rawMessage ?? "An unknown deployment error occurred.";
    }
}
