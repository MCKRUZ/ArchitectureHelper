using AzureCraft.Application.Bicep.Dtos;
using AzureCraft.Infrastructure.Bicep.Shared;

namespace AzureCraft.Infrastructure.Bicep.Modules;

/// <summary>
/// Generates the VNet + subnets + NSGs module. Always generated when a VNet exists.
/// </summary>
public sealed class VirtualNetworkModule : IBicepModule
{
    public string ServiceType => "virtual-network";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);

        // Find subnet children
        var subnets = ctx.AllNodes
            .Where(n => n.GroupType == "subnet" && n.LogicalParent == node.Id)
            .ToList();

        var sb = new BicepStringBuilder();

        // NSG for app subnet
        sb.Comment("Network Security Group — App Subnet");
        sb.AppendLine("resource appNsg 'Microsoft.Network/networkSecurityGroups@2024-01-01' = {");
        sb.AppendLine($"  name: 'nsg-{safeName}-app'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    securityRules: [");
        sb.AppendLine("      {");
        sb.AppendLine("        name: 'AllowHTTPS'");
        sb.AppendLine("        properties: {");
        sb.AppendLine("          priority: 100");
        sb.AppendLine("          direction: 'Inbound'");
        sb.AppendLine("          access: 'Allow'");
        sb.AppendLine("          protocol: 'Tcp'");
        sb.AppendLine("          sourcePortRange: '*'");
        sb.AppendLine("          destinationPortRange: '443'");
        sb.AppendLine("          sourceAddressPrefix: '*'");
        sb.AppendLine("          destinationAddressPrefix: '*'");
        sb.AppendLine("        }");
        sb.AppendLine("      }");
        sb.AppendLine("    ]");
        sb.AppendLine("  }");
        sb.AppendLine("}");
        sb.AppendLine();

        // NSG for data subnet
        sb.Comment("Network Security Group — Data Subnet");
        sb.AppendLine("resource dataNsg 'Microsoft.Network/networkSecurityGroups@2024-01-01' = {");
        sb.AppendLine($"  name: 'nsg-{safeName}-data'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    securityRules: [");
        sb.AppendLine("      {");
        sb.AppendLine("        name: 'DenyAllInbound'");
        sb.AppendLine("        properties: {");
        sb.AppendLine("          priority: 4096");
        sb.AppendLine("          direction: 'Inbound'");
        sb.AppendLine("          access: 'Deny'");
        sb.AppendLine("          protocol: '*'");
        sb.AppendLine("          sourcePortRange: '*'");
        sb.AppendLine("          destinationPortRange: '*'");
        sb.AppendLine("          sourceAddressPrefix: '*'");
        sb.AppendLine("          destinationAddressPrefix: '*'");
        sb.AppendLine("        }");
        sb.AppendLine("      }");
        sb.AppendLine("    ]");
        sb.AppendLine("  }");
        sb.AppendLine("}");
        sb.AppendLine();

        // VNet
        sb.Comment($"Virtual Network: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.Network/virtualNetworks@2024-01-01' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    addressSpace: {");
        sb.AppendLine("      addressPrefixes: ['10.0.0.0/16']");
        sb.AppendLine("    }");
        sb.AppendLine("    subnets: [");

        // Always generate app and data subnets
        sb.AppendLine("      {");
        sb.AppendLine("        name: 'app-subnet'");
        sb.AppendLine("        properties: {");
        sb.AppendLine("          addressPrefix: '10.0.1.0/24'");
        sb.AppendLine("          networkSecurityGroup: { id: appNsg.id }");
        sb.AppendLine("        }");
        sb.AppendLine("      }");
        sb.AppendLine("      {");
        sb.AppendLine("        name: 'data-subnet'");
        sb.AppendLine("        properties: {");
        sb.AppendLine("          addressPrefix: '10.0.2.0/24'");
        sb.AppendLine("          networkSecurityGroup: { id: dataNsg.id }");
        sb.AppendLine("        }");
        sb.AppendLine("      }");
        sb.AppendLine("    ]");
        sb.AppendLine("  }");
        sb.AppendLine("}");
        sb.AppendLine();

        // Output subnet IDs for reference by other modules
        sb.AppendLine($"output vnetId string = {symbol}.id");
        sb.AppendLine($"output appSubnetId string = {symbol}.properties.subnets[0].id");
        sb.AppendLine($"output dataSubnetId string = {symbol}.properties.subnets[1].id");

        return sb.ToString();
    }
}

/// <summary>
/// Application Gateway module.
/// </summary>
public sealed class ApplicationGatewayModule : IBicepModule
{
    public string ServiceType => "application-gateway";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);
        var sku = node.Sku ?? "Standard_v2";

        var sb = new BicepStringBuilder();

        // Public IP for App Gateway
        sb.AppendLine($"resource {symbol}Pip 'Microsoft.Network/publicIPAddresses@2024-01-01' = {{");
        sb.AppendLine($"  name: 'pip-{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  sku: { name: 'Standard' }");
        sb.AppendLine("  properties: { publicIPAllocationMethod: 'Static' }");
        sb.AppendLine("}");
        sb.AppendLine();

        sb.Comment($"Application Gateway: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.Network/applicationGateways@2024-01-01' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    sku: {");
        sb.AppendLine($"      name: '{sku}'");
        sb.AppendLine($"      tier: '{sku}'");
        sb.AppendLine("      capacity: 2");
        sb.AppendLine("    }");
        sb.AppendLine("    gatewayIPConfigurations: [");
        sb.AppendLine("      {");
        sb.AppendLine("        name: 'appGatewayIpConfig'");
        sb.AppendLine("        properties: {");
        sb.AppendLine("          subnet: { id: appSubnetId }");
        sb.AppendLine("        }");
        sb.AppendLine("      }");
        sb.AppendLine("    ]");
        sb.AppendLine("    frontendIPConfigurations: [");
        sb.AppendLine("      {");
        sb.AppendLine("        name: 'appGatewayFrontendIp'");
        sb.AppendLine("        properties: {");
        sb.AppendLine($"          publicIPAddress: {{ id: {symbol}Pip.id }}");
        sb.AppendLine("        }");
        sb.AppendLine("      }");
        sb.AppendLine("    ]");
        sb.AppendLine("    frontendPorts: [ { name: 'port443', properties: { port: 443 } } ]");
        sb.AppendLine("    backendAddressPools: [ { name: 'defaultBackendPool' } ]");
        sb.AppendLine("    backendHttpSettingsCollection: [");
        sb.AppendLine("      { name: 'defaultHttpSettings', properties: { port: 443, protocol: 'Https' } }");
        sb.AppendLine("    ]");
        sb.AppendLine("    httpListeners: [");
        sb.AppendLine("      {");
        sb.AppendLine("        name: 'defaultListener'");
        sb.AppendLine("        properties: {");
        sb.AppendLine("          frontendIPConfiguration: { id: resourceId('Microsoft.Network/applicationGateways/frontendIPConfigurations', '{safeName}', 'appGatewayFrontendIp') }");
        sb.AppendLine("          frontendPort: { id: resourceId('Microsoft.Network/applicationGateways/frontendPorts', '{safeName}', 'port443') }");
        sb.AppendLine("          protocol: 'Https'");
        sb.AppendLine("        }");
        sb.AppendLine("      }");
        sb.AppendLine("    ]");
        sb.AppendLine("    requestRoutingRules: [");
        sb.AppendLine("      {");
        sb.AppendLine("        name: 'defaultRule'");
        sb.AppendLine("        properties: {");
        sb.AppendLine("          ruleType: 'Basic'");
        sb.AppendLine("          priority: 100");
        sb.AppendLine("          httpListener: { id: resourceId('Microsoft.Network/applicationGateways/httpListeners', '{safeName}', 'defaultListener') }");
        sb.AppendLine("          backendAddressPool: { id: resourceId('Microsoft.Network/applicationGateways/backendAddressPools', '{safeName}', 'defaultBackendPool') }");
        sb.AppendLine("          backendHttpSettings: { id: resourceId('Microsoft.Network/applicationGateways/backendHttpSettingsCollection', '{safeName}', 'defaultHttpSettings') }");
        sb.AppendLine("        }");
        sb.AppendLine("      }");
        sb.AppendLine("    ]");
        sb.AppendLine("  }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}

/// <summary>
/// Load Balancer module.
/// </summary>
public sealed class LoadBalancerModule : IBicepModule
{
    public string ServiceType => "load-balancer";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);

        var sb = new BicepStringBuilder();

        sb.AppendLine($"resource {symbol}Pip 'Microsoft.Network/publicIPAddresses@2024-01-01' = {{");
        sb.AppendLine($"  name: 'pip-{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  sku: { name: 'Standard' }");
        sb.AppendLine("  properties: { publicIPAllocationMethod: 'Static' }");
        sb.AppendLine("}");
        sb.AppendLine();

        sb.Comment($"Load Balancer: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.Network/loadBalancers@2024-01-01' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("  sku: { name: 'Standard' }");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    frontendIPConfigurations: [");
        sb.AppendLine("      {");
        sb.AppendLine("        name: 'frontendIp'");
        sb.AppendLine("        properties: {");
        sb.AppendLine($"          publicIPAddress: {{ id: {symbol}Pip.id }}");
        sb.AppendLine("        }");
        sb.AppendLine("      }");
        sb.AppendLine("    ]");
        sb.AppendLine("    backendAddressPools: [ { name: 'backendPool' } ]");
        sb.AppendLine("    probes: [");
        sb.AppendLine("      { name: 'healthProbe', properties: { protocol: 'Tcp', port: 443, intervalInSeconds: 15 } }");
        sb.AppendLine("    ]");
        sb.AppendLine("  }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}

/// <summary>
/// Azure Front Door (AFD Standard/Premium) module.
/// </summary>
public sealed class FrontDoorModule : IBicepModule
{
    public string ServiceType => "front-door";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);
        var sku = node.Sku ?? "Standard_AzureFrontDoor";

        var sb = new BicepStringBuilder();
        sb.Comment($"Azure Front Door: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.Cdn/profiles@2024-02-01' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: 'global'");
        sb.AppendLine("  sku: {");
        sb.AppendLine($"    name: '{sku}'");
        sb.AppendLine("  }");
        sb.AppendLine("}");
        sb.AppendLine();

        // Default endpoint
        sb.AppendLine($"resource {symbol}Endpoint 'Microsoft.Cdn/profiles/afdEndpoints@2024-02-01' = {{");
        sb.AppendLine($"  parent: {symbol}");
        sb.AppendLine($"  name: '{safeName}-endpoint'");
        sb.AppendLine("  location: 'global'");
        sb.AppendLine("  properties: {");
        sb.AppendLine("    enabledState: 'Enabled'");
        sb.AppendLine("  }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}

/// <summary>
/// DDoS Protection Plan module.
/// </summary>
public sealed class DdosProtectionModule : IBicepModule
{
    public string ServiceType => "ddos-protection";

    public string Generate(ExportNodeDto node, BicepTemplateContext ctx)
    {
        var safeName = BicepStringBuilder.SafeName(node.DisplayName);
        var symbol = BicepStringBuilder.SymbolName(node.DisplayName);

        var sb = new BicepStringBuilder();
        sb.Comment($"DDoS Protection Plan: {node.DisplayName}");
        sb.AppendLine($"resource {symbol} 'Microsoft.Network/ddosProtectionPlans@2024-01-01' = {{");
        sb.AppendLine($"  name: '{safeName}'");
        sb.AppendLine("  location: location");
        sb.AppendLine("}");

        return sb.ToString();
    }
}
