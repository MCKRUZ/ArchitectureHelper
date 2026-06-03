namespace AzureCraft.Domain.ValueObjects;

/// <summary>
/// Metadata about an ARM resource type used for Bicep generation and deployment.
/// </summary>
public sealed record ArmResourceMetadata(
    string ResourceType,
    string ApiVersion,
    bool SupportsPrivateEndpoint = false,
    bool SupportsVNetIntegration = false,
    bool SupportsDiagnosticSettings = false,
    bool RequiresAppServicePlan = false,
    string? CompanionResourceType = null,
    string? Kind = null);

/// <summary>
/// Maps each <see cref="AzureServiceType"/> to its ARM resource metadata.
/// </summary>
public static class ArmResourceMapping
{
    private static readonly IReadOnlyDictionary<AzureServiceType, ArmResourceMetadata> Mappings =
        new Dictionary<AzureServiceType, ArmResourceMetadata>
        {
            [AzureServiceType.AppService] = new(
                "Microsoft.Web/sites", "2023-12-01",
                SupportsPrivateEndpoint: true,
                SupportsVNetIntegration: true,
                SupportsDiagnosticSettings: true,
                RequiresAppServicePlan: true),

            [AzureServiceType.FunctionApp] = new(
                "Microsoft.Web/sites", "2023-12-01",
                SupportsPrivateEndpoint: true,
                SupportsVNetIntegration: true,
                SupportsDiagnosticSettings: true,
                RequiresAppServicePlan: true,
                Kind: "functionapp"),

            [AzureServiceType.VirtualMachine] = new(
                "Microsoft.Compute/virtualMachines", "2024-03-01",
                SupportsDiagnosticSettings: true),

            [AzureServiceType.ContainerApps] = new(
                "Microsoft.App/containerApps", "2024-03-01",
                SupportsVNetIntegration: true,
                SupportsDiagnosticSettings: true,
                CompanionResourceType: "Microsoft.App/managedEnvironments"),

            [AzureServiceType.Aks] = new(
                "Microsoft.ContainerService/managedClusters", "2024-02-01",
                SupportsPrivateEndpoint: true,
                SupportsVNetIntegration: true,
                SupportsDiagnosticSettings: true),

            [AzureServiceType.AzureSql] = new(
                "Microsoft.Sql/servers", "2023-08-01-preview",
                SupportsPrivateEndpoint: true,
                SupportsDiagnosticSettings: true,
                CompanionResourceType: "Microsoft.Sql/servers/databases"),

            [AzureServiceType.CosmosDb] = new(
                "Microsoft.DocumentDB/databaseAccounts", "2024-02-15-preview",
                SupportsPrivateEndpoint: true,
                SupportsDiagnosticSettings: true),

            [AzureServiceType.StorageAccount] = new(
                "Microsoft.Storage/storageAccounts", "2023-05-01",
                SupportsPrivateEndpoint: true,
                SupportsDiagnosticSettings: true),

            [AzureServiceType.RedisCache] = new(
                "Microsoft.Cache/redis", "2024-03-01",
                SupportsPrivateEndpoint: true,
                SupportsDiagnosticSettings: true),

            [AzureServiceType.VirtualNetwork] = new(
                "Microsoft.Network/virtualNetworks", "2024-01-01",
                SupportsDiagnosticSettings: true),

            [AzureServiceType.ApplicationGateway] = new(
                "Microsoft.Network/applicationGateways", "2024-01-01",
                SupportsDiagnosticSettings: true),

            [AzureServiceType.LoadBalancer] = new(
                "Microsoft.Network/loadBalancers", "2024-01-01",
                SupportsDiagnosticSettings: true),

            [AzureServiceType.FrontDoor] = new(
                "Microsoft.Cdn/profiles", "2024-02-01",
                SupportsDiagnosticSettings: true),

            [AzureServiceType.KeyVault] = new(
                "Microsoft.KeyVault/vaults", "2023-07-01",
                SupportsPrivateEndpoint: true,
                SupportsDiagnosticSettings: true),

            [AzureServiceType.ApiManagement] = new(
                "Microsoft.ApiManagement/service", "2023-09-01-preview",
                SupportsPrivateEndpoint: true,
                SupportsVNetIntegration: true,
                SupportsDiagnosticSettings: true),

            [AzureServiceType.ServiceBus] = new(
                "Microsoft.ServiceBus/namespaces", "2024-01-01",
                SupportsPrivateEndpoint: true,
                SupportsDiagnosticSettings: true),

            [AzureServiceType.EventHub] = new(
                "Microsoft.EventHub/namespaces", "2024-01-01",
                SupportsPrivateEndpoint: true,
                SupportsDiagnosticSettings: true),

            [AzureServiceType.AzureOpenAi] = new(
                "Microsoft.CognitiveServices/accounts", "2024-04-01-preview",
                SupportsPrivateEndpoint: true,
                SupportsDiagnosticSettings: true,
                Kind: "OpenAI"),

            [AzureServiceType.EntraId] = new(
                "Microsoft.AzureActiveDirectory/b2cDirectories", "2021-04-01",
                SupportsDiagnosticSettings: false),

            [AzureServiceType.LogAnalytics] = new(
                "Microsoft.OperationalInsights/workspaces", "2023-09-01",
                SupportsDiagnosticSettings: false),

            [AzureServiceType.ApplicationInsights] = new(
                "Microsoft.Insights/components", "2020-02-02",
                SupportsDiagnosticSettings: false),

            [AzureServiceType.AiSearch] = new(
                "Microsoft.Search/searchServices", "2024-03-01-preview",
                SupportsPrivateEndpoint: true,
                SupportsDiagnosticSettings: true),

            [AzureServiceType.DdosProtection] = new(
                "Microsoft.Network/ddosProtectionPlans", "2024-01-01"),

            [AzureServiceType.EventGrid] = new(
                "Microsoft.EventGrid/topics", "2024-06-01-preview",
                SupportsPrivateEndpoint: true,
                SupportsDiagnosticSettings: true),

            [AzureServiceType.StaticWebApp] = new(
                "Microsoft.Web/staticSites", "2023-12-01",
                SupportsDiagnosticSettings: true),

            [AzureServiceType.ResourceGroup] = new(
                "Microsoft.Resources/resourceGroups", "2024-03-01"),
        };

    /// <summary>
    /// Gets ARM metadata for the given service type.
    /// Returns null for types with no ARM resource (e.g. logical groupings).
    /// </summary>
    public static ArmResourceMetadata? GetMetadata(AzureServiceType serviceType) =>
        Mappings.TryGetValue(serviceType, out var metadata) ? metadata : null;

    /// <summary>
    /// Gets all registered ARM mappings.
    /// </summary>
    public static IReadOnlyDictionary<AzureServiceType, ArmResourceMetadata> GetAll() => Mappings;

    /// <summary>
    /// Checks whether a service type has an ARM resource mapping.
    /// </summary>
    public static bool HasMapping(AzureServiceType serviceType) => Mappings.ContainsKey(serviceType);
}
