using AzureCraft.Application.Bicep.Dtos;
using AzureCraft.Infrastructure.Bicep.Shared;

namespace AzureCraft.Infrastructure.Bicep.Modules;

/// <summary>
/// Azure SQL Server + Database module.
/// </summary>
public sealed class AzureSqlModule : IBicepModule
{
    public string ServiceType => "azure-sql";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);

        var sb = new BicepStringBuilder();

        // SQL Server
        sb.Comment($"Azure SQL Server: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.Sql/servers@2023-08-01-preview' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    administratorLogin: sqlAdminLogin");
        sb.AppendLine("    administratorLoginPassword: sqlAdminPassword");
        sb.AppendLine("    minimalTlsVersion: '1.2'");
        sb.AppendLine("    publicNetworkAccess: 'Disabled'");
        sb.AppendLine("  }");
        sb.AppendLine("}");
        sb.AppendLine();

        // Database
        sb.Comment($"Azure SQL Database");
        sb.AppendLine($"resource {symbol}Db 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {{");
        sb.AppendLine($"  parent: {symbol}");
        sb.AppendLine($"  name: '{safeName}-db'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  sku: {");
        sb.AppendLine("    name: 'GP_Gen5_2'");
        sb.AppendLine("    tier: 'GeneralPurpose'");
        sb.AppendLine("  }");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    collation: 'SQL_Latin1_General_CP1_CI_AS'");
        sb.AppendLine("    maxSizeBytes: 34359738368");
        sb.AppendLine("    zoneRedundant: false");
        sb.AppendLine("  }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}

/// <summary>
/// Cosmos DB module.
/// </summary>
public sealed class CosmosDbModule : IBicepModule
{
    public string ServiceType => "cosmos-db";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);

        var sb = new BicepStringBuilder();
        sb.Comment($"Cosmos DB: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.DocumentDB/databaseAccounts@2024-02-15-preview' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  kind: 'GlobalDocumentDB'");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    databaseAccountOfferType: 'Standard'");
        sb.AppendLine("    consistencyPolicy: { defaultConsistencyLevel: 'Session' }");
        sb.AppendLine("    locations: [");
        sb.AppendLine("      { locationName: location, failoverPriority: 0, isZoneRedundant: false }");
        sb.AppendLine("    ]");
        sb.AppendLine("    publicNetworkAccess: 'Disabled'");
        sb.AppendLine("    enableFreeTier: false");
        sb.AppendLine("  }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}

/// <summary>
/// Redis Cache module.
/// </summary>
public sealed class RedisCacheModule : IBicepModule
{
    public string ServiceType => "redis-cache";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);
        var sku = node.Sku ?? "Standard";

        var sb = new BicepStringBuilder();
        sb.Comment($"Azure Cache for Redis: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.Cache/redis@2024-03-01' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    sku: {");
        sb.AppendLine($"      name: '{sku}'");
        sb.AppendLine("      family: 'C'");
        sb.AppendLine("      capacity: 1");
        sb.AppendLine("    }");
        sb.AppendLine("    enableNonSslPort: false");
        sb.AppendLine("    minimumTlsVersion: '1.2'");
        sb.AppendLine("    publicNetworkAccess: 'Disabled'");
        sb.AppendLine("  }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}

/// <summary>
/// Storage Account module.
/// </summary>
public sealed class StorageAccountModule : IBicepModule
{
    public string ServiceType => "storage-account";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName).Replace("-", "");
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);
        var sku = node.Sku ?? "Standard_LRS";

        var sb = new BicepStringBuilder();
        sb.Comment($"Storage Account: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.Storage/storageAccounts@2023-05-01' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  kind: 'StorageV2'");
        sb.AppendLine("  sku: {");
        sb.AppendLine($"    name: '{sku}'");
        sb.AppendLine("  }");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    supportsHttpsTrafficOnly: true");
        sb.AppendLine("    minimumTlsVersion: 'TLS1_2'");
        sb.AppendLine("    allowBlobPublicAccess: false");
        sb.AppendLine("    publicNetworkAccess: 'Disabled'");
        sb.AppendLine("  }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}
