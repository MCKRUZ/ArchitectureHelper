using AzureCraft.Application.Bicep.Dtos;
using AzureCraft.Infrastructure.Bicep.Shared;

namespace AzureCraft.Infrastructure.Bicep.Modules;

/// <summary>
/// App Service module — generates App Service Plan + Web App.
/// </summary>
public sealed class AppServiceModule : IBicepModule
{
    public string ServiceType => "app-service";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);
        var sku = ResolveSku(node);

        var sb = new BicepStringBuilder();

        // App Service Plan
        sb.Comment($"App Service Plan for {node.DisplayName}");
        sb.AppendLine($"resource {symbol}Plan 'Microsoft.Web/serverfarms@2023-12-01' = {{");
        sb.AppendLine($"  name: 'plan-{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  sku: {");
        sb.AppendLine($"    name: '{sku.Name}'");
        sb.AppendLine($"    tier: '{sku.Tier}'");
        sb.AppendLine("  }");
        sb.AppendLine("  kind: 'linux'");
        sb.AppendLine("  properties: { reserved: true }");
        sb.AppendLine("}");
        sb.AppendLine();

        // Web App
        sb.Comment($"App Service: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.Web/sites@2023-12-01' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  properties: {");
        sb.AppendLine($"    serverFarmId: {symbol}Plan.id");
        sb.AppendLine("    httpsOnly: true");
        sb.AppendLine("    siteConfig: {");
        sb.AppendLine("      minTlsVersion: '1.2'");
        sb.AppendLine("      ftpsState: 'Disabled'");

        // VNet integration if connected
        if (ctx.GetEdgesOfType(node.Id, "vnet-integration").Any())
            sb.AppendLine("      vnetRouteAllEnabled: true");

        sb.AppendLine("    }");

        if (ctx.GetEdgesOfType(node.Id, "vnet-integration").Any())
            sb.AppendLine("    virtualNetworkSubnetId: appSubnetId");

        sb.AppendLine("  }");
        sb.AppendLine("  identity: { type: 'SystemAssigned' }");
        sb.AppendLine("}");

        return sb.ToString();
    }

    private static (string Name, string Tier) ResolveSku(ExportNodeDto node)
    {
        var tier = GetPricingProperty(node, "tier");
        return tier switch
        {
            "free-f1" => ("F1", "Free"),
            "basic-b1" => ("B1", "Basic"),
            "basic-b2" => ("B2", "Basic"),
            "basic-b3" => ("B3", "Basic"),
            "standard-s1" => ("S1", "Standard"),
            "standard-s2" => ("S2", "Standard"),
            "standard-s3" => ("S3", "Standard"),
            "premium-p1v3" => ("P1v3", "PremiumV3"),
            "premium-p2v3" => ("P2v3", "PremiumV3"),
            "premium-p3v3" => ("P3v3", "PremiumV3"),
            _ => ("S1", "Standard"),
        };
    }

    private static string? GetPricingProperty(ExportNodeDto node, string key)
    {
        if (node.Properties?.TryGetValue("pricing", out var pricing) == true &&
            pricing is System.Text.Json.JsonElement pricingEl &&
            pricingEl.ValueKind == System.Text.Json.JsonValueKind.Object &&
            pricingEl.TryGetProperty(key, out var value))
        {
            return value.GetString();
        }
        return null;
    }
}

/// <summary>
/// Function App module.
/// </summary>
public sealed class FunctionAppModule : IBicepModule
{
    public string ServiceType => "function-app";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);

        var sb = new BicepStringBuilder();

        sb.Comment($"App Service Plan for {node.DisplayName}");
        sb.AppendLine($"resource {symbol}Plan 'Microsoft.Web/serverfarms@2023-12-01' = {{");
        sb.AppendLine($"  name: 'plan-{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  sku: { name: 'Y1', tier: 'Dynamic' }");
        sb.AppendLine("  kind: 'functionapp'");
        sb.AppendLine("  properties: { reserved: true }");
        sb.AppendLine("}");
        sb.AppendLine();

        sb.Comment($"Function App: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.Web/sites@2023-12-01' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  kind: 'functionapp,linux'");
        sb.AppendLine("  properties: {");
        sb.AppendLine($"    serverFarmId: {symbol}Plan.id");
        sb.AppendLine("    httpsOnly: true");
        sb.AppendLine("    siteConfig: {");
        sb.AppendLine("      minTlsVersion: '1.2'");
        sb.AppendLine("      ftpsState: 'Disabled'");
        sb.AppendLine("    }");
        sb.AppendLine("  }");
        sb.AppendLine("  identity: { type: 'SystemAssigned' }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}

/// <summary>
/// Virtual Machine module.
/// </summary>
public sealed class VirtualMachineModule : IBicepModule
{
    public string ServiceType => "virtual-machine";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);
        var vmSize = node.Sku ?? "Standard_B2s";

        var sb = new BicepStringBuilder();

        // NIC
        sb.AppendLine($"resource {symbol}Nic 'Microsoft.Network/networkInterfaces@2024-01-01' = {{");
        sb.AppendLine($"  name: 'nic-{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    ipConfigurations: [");
        sb.AppendLine("      {");
        sb.AppendLine("        name: 'ipconfig1'");
        sb.AppendLine("        properties: {");
        sb.AppendLine("          subnet: { id: appSubnetId }");
        sb.AppendLine("          privateIPAllocationMethod: 'Dynamic'");
        sb.AppendLine("        }");
        sb.AppendLine("      }");
        sb.AppendLine("    ]");
        sb.AppendLine("  }");
        sb.AppendLine("}");
        sb.AppendLine();

        // VM
        sb.Comment($"Virtual Machine: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.Compute/virtualMachines@2024-03-01' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    hardwareProfile: {");
        sb.AppendLine($"      vmSize: '{vmSize}'");
        sb.AppendLine("    }");
        sb.AppendLine("    osProfile: {");
        sb.AppendLine($"      computerName: '{safeName}'");
        sb.AppendLine($"      adminUsername: adminUsername");
        sb.AppendLine($"      adminPassword: adminPassword");
        sb.AppendLine("    }");
        sb.AppendLine("    storageProfile: {");
        sb.AppendLine("      imageReference: {");
        sb.AppendLine("        publisher: 'Canonical'");
        sb.AppendLine("        offer: '0001-com-ubuntu-server-jammy'");
        sb.AppendLine("        sku: '22_04-lts-gen2'");
        sb.AppendLine("        version: 'latest'");
        sb.AppendLine("      }");
        sb.AppendLine("      osDisk: {");
        sb.AppendLine("        createOption: 'FromImage'");
        sb.AppendLine("        managedDisk: { storageAccountType: 'Premium_LRS' }");
        sb.AppendLine("      }");
        sb.AppendLine("    }");
        sb.AppendLine("    networkProfile: {");
        sb.AppendLine($"      networkInterfaces: [ {{ id: {symbol}Nic.id }} ]");
        sb.AppendLine("    }");
        sb.AppendLine("  }");
        sb.AppendLine("  identity: { type: 'SystemAssigned' }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}

/// <summary>
/// Container Apps + Managed Environment module.
/// </summary>
public sealed class ContainerAppsModule : IBicepModule
{
    public string ServiceType => "container-apps";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);

        var sb = new BicepStringBuilder();

        sb.Comment($"Container Apps Environment for {node.DisplayName}");
        sb.AppendLine($"resource {symbol}Env 'Microsoft.App/managedEnvironments@2024-03-01' = {{");
        sb.AppendLine($"  name: 'cae-{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  properties: {");

        if (ctx.HasLogAnalytics)
        {
            sb.AppendLine("    appLogsConfiguration: {");
            sb.AppendLine("      destination: 'log-analytics'");
            sb.AppendLine("      logAnalyticsConfiguration: {");
            sb.AppendLine("        customerId: logAnalytics.properties.customerId");
            sb.AppendLine("        sharedKey: logAnalytics.listKeys().primarySharedKey");
            sb.AppendLine("      }");
            sb.AppendLine("    }");
        }

        if (ctx.HasVNet)
        {
            sb.AppendLine("    vnetConfiguration: {");
            sb.AppendLine("      infrastructureSubnetId: appSubnetId");
            sb.AppendLine("      internal: false");
            sb.AppendLine("    }");
        }

        sb.AppendLine("  }");
        sb.AppendLine("}");
        sb.AppendLine();

        sb.Comment($"Container App: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.App/containerApps@2024-03-01' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  properties: {");
        sb.AppendLine($"    managedEnvironmentId: {symbol}Env.id");
        sb.AppendLine("    configuration: {");
        sb.AppendLine("      ingress: {");
        sb.AppendLine("        external: true");
        sb.AppendLine("        targetPort: 8080");
        sb.AppendLine("        transport: 'http'");
        sb.AppendLine("      }");
        sb.AppendLine("    }");
        sb.AppendLine("    template: {");
        sb.AppendLine("      containers: [");
        sb.AppendLine("        {");
        sb.AppendLine($"          name: '{safeName}'");
        sb.AppendLine("          image: 'mcr.microsoft.com/k8se/quickstart:latest'");
        sb.AppendLine("          resources: { cpu: json('0.5'), memory: '1Gi' }");
        sb.AppendLine("        }");
        sb.AppendLine("      ]");
        sb.AppendLine("      scale: { minReplicas: 1, maxReplicas: 3 }");
        sb.AppendLine("    }");
        sb.AppendLine("  }");
        sb.AppendLine("  identity: { type: 'SystemAssigned' }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}

/// <summary>
/// AKS module.
/// </summary>
public sealed class AksModule : IBicepModule
{
    public string ServiceType => "aks";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);
        var vmSize = node.Sku ?? "Standard_DS2_v2";

        var sb = new BicepStringBuilder();
        sb.Comment($"Azure Kubernetes Service: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.ContainerService/managedClusters@2024-02-01' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  identity: { type: 'SystemAssigned' }");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    dnsPrefix: '${safeName}-dns'");
        sb.AppendLine("    agentPoolProfiles: [");
        sb.AppendLine("      {");
        sb.AppendLine("        name: 'nodepool1'");
        sb.AppendLine("        count: 3");
        sb.AppendLine($"        vmSize: '{vmSize}'");
        sb.AppendLine("        mode: 'System'");
        sb.AppendLine("        osType: 'Linux'");

        if (ctx.HasVNet)
            sb.AppendLine("        vnetSubnetID: appSubnetId");

        sb.AppendLine("      }");
        sb.AppendLine("    ]");
        sb.AppendLine("    networkProfile: {");
        sb.AppendLine("      networkPlugin: 'azure'");
        sb.AppendLine("      networkPolicy: 'calico'");
        sb.AppendLine("    }");
        sb.AppendLine("  }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}

/// <summary>
/// Static Web App module.
/// </summary>
public sealed class StaticWebAppModule : IBicepModule
{
    public string ServiceType => "static-web-app";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);
        var sku = node.Sku ?? "Free";

        var sb = new BicepStringBuilder();
        sb.Comment($"Static Web App: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.Web/staticSites@2023-12-01' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  sku: {");
        sb.AppendLine($"    name: '{sku}'");
        sb.AppendLine("  }");
        sb.AppendLine("  properties: {}");
        sb.AppendLine("}");

        return sb.ToString();
    }
}
