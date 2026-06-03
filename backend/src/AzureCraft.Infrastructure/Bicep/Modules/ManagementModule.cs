using AzureCraft.Application.Bicep.Dtos;
using AzureCraft.Infrastructure.Bicep.Shared;

namespace AzureCraft.Infrastructure.Bicep.Modules;

/// <summary>
/// Log Analytics Workspace module.
/// </summary>
public sealed class LogAnalyticsModule : IBicepModule
{
    public string ServiceType => "log-analytics";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);

        var sb = new BicepStringBuilder();
        sb.Comment($"Log Analytics Workspace: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    sku: { name: 'PerGB2018' }");
        sb.AppendLine("    retentionInDays: 30");
        sb.AppendLine("  }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}

/// <summary>
/// Application Insights module.
/// </summary>
public sealed class ApplicationInsightsModule : IBicepModule
{
    public string ServiceType => "application-insights";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);

        var sb = new BicepStringBuilder();
        sb.Comment($"Application Insights: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.Insights/components@2020-02-02' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  kind: 'web'");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    Application_Type: 'web'");

        if (ctx.HasLogAnalytics)
            sb.AppendLine("    WorkspaceResourceId: logAnalytics.id");

        sb.AppendLine("  }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}
