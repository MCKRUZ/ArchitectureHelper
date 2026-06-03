using AzureCraft.Application.Bicep.Dtos;
using AzureCraft.Infrastructure.Bicep.Shared;

namespace AzureCraft.Infrastructure.Bicep.Modules;

/// <summary>
/// Key Vault module.
/// </summary>
public sealed class KeyVaultModule : IBicepModule
{
    public string ServiceType => "key-vault";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);

        var sb = new BicepStringBuilder();
        sb.Comment($"Key Vault: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.KeyVault/vaults@2023-07-01' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    tenantId: subscription().tenantId");
        sb.AppendLine("    sku: { family: 'A', name: 'standard' }");
        sb.AppendLine("    enableRbacAuthorization: true");
        sb.AppendLine("    enableSoftDelete: true");
        sb.AppendLine("    softDeleteRetentionInDays: 90");
        sb.AppendLine("    enablePurgeProtection: true");
        sb.AppendLine("    publicNetworkAccess: 'Disabled'");
        sb.AppendLine("    networkAcls: {");
        sb.AppendLine("      defaultAction: 'Deny'");
        sb.AppendLine("      bypass: 'AzureServices'");
        sb.AppendLine("    }");
        sb.AppendLine("  }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}

/// <summary>
/// Entra ID — no ARM resource, generates a comment.
/// </summary>
public sealed class EntraIdModule : IBicepModule
{
    public string ServiceType => "entra-id";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var sb = new BicepStringBuilder();
        sb.Comment("=== Entra ID (Azure Active Directory) ===");
        sb.Comment("Entra ID is a tenant-level service and is not provisioned via ARM/Bicep.");
        sb.Comment("Configure app registrations, service principals, and RBAC assignments");
        sb.Comment("via the Entra ID portal or Microsoft Graph API.");
        sb.Comment($"Node: {node.DisplayName}");
        return sb.ToString();
    }
}
