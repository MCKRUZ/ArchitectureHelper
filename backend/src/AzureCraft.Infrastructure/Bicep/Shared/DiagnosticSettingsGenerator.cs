namespace AzureCraft.Infrastructure.Bicep.Shared;

/// <summary>
/// Generates Bicep diagnostic settings blocks that send logs/metrics to Log Analytics.
/// </summary>
public static class DiagnosticSettingsGenerator
{
    /// <summary>
    /// Generate a diagnostic settings resource for a given parent resource.
    /// </summary>
    public static string Generate(string parentSymbol, string displayName)
    {
        var symbolName = BicepStringBuilder.SymbolName(displayName);
        var safeName = BicepStringBuilder.SafeName(displayName);

        var sb = new BicepStringBuilder();
        sb.Comment($"Diagnostic settings for {displayName}");
        sb.AppendLine($"resource {symbolName}Diag 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {{");
        sb.AppendLine($"  scope: {parentSymbol}");
        sb.AppendLine($"  name: '{safeName}-diag'");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    workspaceId: logAnalytics.id");
        sb.AppendLine("    logs: [");
        sb.AppendLine("      {");
        sb.AppendLine("        categoryGroup: 'allLogs'");
        sb.AppendLine("        enabled: true");
        sb.AppendLine("      }");
        sb.AppendLine("    ]");
        sb.AppendLine("    metrics: [");
        sb.AppendLine("      {");
        sb.AppendLine("        category: 'AllMetrics'");
        sb.AppendLine("        enabled: true");
        sb.AppendLine("      }");
        sb.AppendLine("    ]");
        sb.AppendLine("  }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}
