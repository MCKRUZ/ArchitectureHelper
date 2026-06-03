using AzureCraft.Application.Bicep.Dtos;
using AzureCraft.Infrastructure.Bicep.Shared;

namespace AzureCraft.Infrastructure.Bicep.Modules;

/// <summary>
/// Azure OpenAI module.
/// </summary>
public sealed class AzureOpenAiModule : IBicepModule
{
    public string ServiceType => "azure-openai";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);
        var sku = node.Sku ?? "S0";

        var sb = new BicepStringBuilder();
        sb.Comment($"Azure OpenAI: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.CognitiveServices/accounts@2024-04-01-preview' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  kind: 'OpenAI'");
        sb.AppendLine("  sku: {");
        sb.AppendLine($"    name: '{sku}'");
        sb.AppendLine("  }");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    publicNetworkAccess: 'Disabled'");
        sb.AppendLine("    customSubDomainName: '${safeName}'");
        sb.AppendLine("  }");
        sb.AppendLine("  identity: { type: 'SystemAssigned' }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}

/// <summary>
/// AI Search module.
/// </summary>
public sealed class AiSearchModule : IBicepModule
{
    public string ServiceType => "ai-search";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);
        var sku = node.Sku ?? "standard";

        var sb = new BicepStringBuilder();
        sb.Comment($"Azure AI Search: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.Search/searchServices@2024-03-01-preview' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  sku: {");
        sb.AppendLine($"    name: '{sku}'");
        sb.AppendLine("  }");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    replicaCount: 1");
        sb.AppendLine("    partitionCount: 1");
        sb.AppendLine("    publicNetworkAccess: 'disabled'");
        sb.AppendLine("  }");
        sb.AppendLine("  identity: { type: 'SystemAssigned' }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}
