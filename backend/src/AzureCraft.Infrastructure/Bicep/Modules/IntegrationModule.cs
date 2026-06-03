using AzureCraft.Application.Bicep.Dtos;
using AzureCraft.Infrastructure.Bicep.Shared;

namespace AzureCraft.Infrastructure.Bicep.Modules;

/// <summary>
/// API Management module.
/// </summary>
public sealed class ApiManagementModule : IBicepModule
{
    public string ServiceType => "api-management";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);
        var sku = node.Sku ?? "Developer";

        var sb = new BicepStringBuilder();
        sb.Comment($"API Management: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.ApiManagement/service@2023-09-01-preview' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  sku: {");
        sb.AppendLine($"    name: '{sku}'");
        sb.AppendLine("    capacity: 1");
        sb.AppendLine("  }");
        sb.AppendLine("  identity: { type: 'SystemAssigned' }");
        sb.AppendLine("  properties: {");
        sb.AppendLine($"    publisherEmail: publisherEmail");
        sb.AppendLine($"    publisherName: publisherName");
        sb.AppendLine("  }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}

/// <summary>
/// Service Bus module.
/// </summary>
public sealed class ServiceBusModule : IBicepModule
{
    public string ServiceType => "service-bus";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);
        var sku = node.Sku ?? "Standard";

        var sb = new BicepStringBuilder();
        sb.Comment($"Service Bus: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.ServiceBus/namespaces@2024-01-01' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  sku: {");
        sb.AppendLine($"    name: '{sku}'");
        sb.AppendLine($"    tier: '{sku}'");
        sb.AppendLine("  }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}

/// <summary>
/// Event Hub module.
/// </summary>
public sealed class EventHubModule : IBicepModule
{
    public string ServiceType => "event-hub";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);
        var sku = node.Sku ?? "Standard";

        var sb = new BicepStringBuilder();
        sb.Comment($"Event Hub: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.EventHub/namespaces@2024-01-01' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  sku: {");
        sb.AppendLine($"    name: '{sku}'");
        sb.AppendLine($"    tier: '{sku}'");
        sb.AppendLine("    capacity: 1");
        sb.AppendLine("  }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}

/// <summary>
/// Event Grid Topics module.
/// </summary>
public sealed class EventGridModule : IBicepModule
{
    public string ServiceType => "event-grid";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);

        var sb = new BicepStringBuilder();
        sb.Comment($"Event Grid Topic: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.EventGrid/topics@2024-06-01-preview' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    inputSchema: 'CloudEventSchemaV1_0'");
        sb.AppendLine("    publicNetworkAccess: 'Disabled'");
        sb.AppendLine("  }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}
