using AzureCraft.Application.Bicep.Dtos;

namespace AzureCraft.Infrastructure.Bicep.Shared;

/// <summary>
/// Generates Bicep for private endpoints, private DNS zones, and DNS zone groups.
/// </summary>
public static class PrivateEndpointGenerator
{
    private static readonly IReadOnlyDictionary<string, (string GroupId, string DnsZoneName)> ServiceGroupIds =
        new Dictionary<string, (string, string)>
        {
            ["azure-sql"] = ("sqlServer", "privatelink.database.windows.net"),
            ["cosmos-db"] = ("Sql", "privatelink.documents.azure.com"),
            ["storage-account"] = ("blob", "privatelink.blob.core.windows.net"),
            ["redis-cache"] = ("redisCache", "privatelink.redis.cache.windows.net"),
            ["key-vault"] = ("vault", "privatelink.vaultcore.azure.net"),
            ["service-bus"] = ("namespace", "privatelink.servicebus.windows.net"),
            ["event-hub"] = ("namespace", "privatelink.servicebus.windows.net"),
            ["azure-openai"] = ("account", "privatelink.openai.azure.com"),
            ["ai-search"] = ("searchService", "privatelink.search.windows.net"),
            ["event-grid"] = ("topic", "privatelink.eventgrid.azure.net"),
            ["aks"] = ("management", "privatelink.eastus.azmk8s.io"),
            ["api-management"] = ("Gateway", "privatelink.azure-api.net"),
            ["app-service"] = ("sites", "privatelink.azurewebsites.net"),
            ["function-app"] = ("sites", "privatelink.azurewebsites.net"),
        };

    /// <summary>
    /// Generate a private endpoint + private DNS zone block for a service node.
    /// </summary>
    public static string Generate(ExportNodeDto node, string resourceSymbol, string subnetResourceRef)
    {
        if (!ServiceGroupIds.TryGetValue(node.ServiceType, out var mapping))
            return $"// Private endpoint not supported for {node.ServiceType}";

        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbolName = BicepStringBuilder.SymbolName(node.DisplayName);

        var sb = new BicepStringBuilder();

        // Private DNS Zone
        sb.Comment($"Private DNS Zone for {node.DisplayName}");
        sb.AppendLine($"resource {symbolName}DnsZone 'Microsoft.Network/privateDnsZones@2024-06-01' = {{");
        sb.AppendLine($"  name: '{mapping.DnsZoneName}'");
        sb.AppendLine($"  location: 'global'");
        sb.AppendLine("}");
        sb.AppendLine();

        // Private DNS Zone VNet Link
        sb.AppendLine($"resource {symbolName}DnsZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {{");
        sb.AppendLine($"  parent: {symbolName}DnsZone");
        sb.AppendLine($"  name: '{safeName}-vnet-link'");
        sb.AppendLine($"  location: 'global'");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    registrationEnabled: false");
        sb.AppendLine("    virtualNetwork: {");
        sb.AppendLine("      id: vnet.id");
        sb.AppendLine("    }");
        sb.AppendLine("  }");
        sb.AppendLine("}");
        sb.AppendLine();

        // Private Endpoint
        sb.Comment($"Private Endpoint for {node.DisplayName}");
        sb.AppendLine($"resource {symbolName}Pe 'Microsoft.Network/privateEndpoints@2024-01-01' = {{");
        sb.AppendLine($"  name: 'pe-{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    subnet: {");
        sb.AppendLine($"      id: {subnetResourceRef}");
        sb.AppendLine("    }");
        sb.AppendLine("    privateLinkServiceConnections: [");
        sb.AppendLine("      {");
        sb.AppendLine($"        name: 'pe-{safeName}-connection'");
        sb.AppendLine("        properties: {");
        sb.AppendLine($"          privateLinkServiceId: {resourceSymbol}.id");
        sb.AppendLine($"          groupIds: ['{mapping.GroupId}']");
        sb.AppendLine("        }");
        sb.AppendLine("      }");
        sb.AppendLine("    ]");
        sb.AppendLine("  }");
        sb.AppendLine("}");
        sb.AppendLine();

        // Private DNS Zone Group
        sb.AppendLine($"resource {symbolName}PeDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-01-01' = {{");
        sb.AppendLine($"  parent: {symbolName}Pe");
        sb.AppendLine($"  name: '{safeName}-dns-group'");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    privateDnsZoneConfigs: [");
        sb.AppendLine("      {");
        sb.AppendLine($"        name: '{safeName}-dns-config'");
        sb.AppendLine("        properties: {");
        sb.AppendLine($"          privateDnsZoneId: {symbolName}DnsZone.id");
        sb.AppendLine("        }");
        sb.AppendLine("      }");
        sb.AppendLine("    ]");
        sb.AppendLine("  }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}
