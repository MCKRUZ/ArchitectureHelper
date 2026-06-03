using System.Text;
using System.Text.Json;
using Azure.Core;
using Azure.ResourceManager;
using Azure.ResourceManager.Resources;
using Azure.ResourceManager.Resources.Models;
using AzureCraft.Application.Bicep.Dtos;
using AzureCraft.Application.Bicep.Services;
using AzureCraft.Application.Deploy;
using AzureCraft.Infrastructure.Azure;
using AzureWaitUntil = Azure.WaitUntil;
using Microsoft.Extensions.Logging;

namespace AzureCraft.Infrastructure.Deploy;

/// <summary>
/// Deploys diagram infrastructure to Azure using ARM JSON (generated from Bicep modules).
/// </summary>
public sealed class DeploymentService(
    IBicepGenerator bicepGenerator,
    ILogger<DeploymentService> logger) : IDeploymentService
{
    public async Task<DeploymentResult> DeployAsync(
        string accessToken,
        string subscriptionId,
        string resourceGroupName,
        string region,
        DiagramExportDto diagram,
        CancellationToken cancellationToken = default)
    {
        // Generate Bicep files first, then use a simplified ARM JSON template
        // (In production, you'd compile Bicep → ARM via bicep CLI. For now, we generate
        // a simplified ARM JSON directly for the deployment pipeline.)
        var bicepResult = await bicepGenerator.GenerateAsync(diagram, cancellationToken);

        var deploymentName = $"azurecraft-{DateTime.UtcNow:yyyyMMddHHmmss}";
        var client = new ArmClient(new StaticTokenCredential(accessToken));

        var rgId = new ResourceIdentifier(
            $"/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}");
        var rgResource = client.GetResourceGroupResource(rgId);
        var deployments = rgResource.GetArmDeployments();

        // Build a minimal ARM template from the diagram
        var armTemplate = BuildArmTemplate(diagram, region);

        var deploymentContent = new ArmDeploymentContent(
            new ArmDeploymentProperties(ArmDeploymentMode.Incremental)
            {
                Template = BinaryData.FromString(armTemplate),
                Parameters = BinaryData.FromString("{}"),
            });

        logger.LogInformation(
            "Starting ARM deployment {DeploymentName} in {ResourceGroup}",
            deploymentName, resourceGroupName);

        var operation = await deployments.CreateOrUpdateAsync(
            AzureWaitUntil.Started,
            deploymentName,
            deploymentContent,
            cancellationToken);

        var portalUrl = $"https://portal.azure.com/#blade/HubsExtension/DeploymentDetailsBlade/overview/id/" +
                        $"%2Fsubscriptions%2F{subscriptionId}%2FresourceGroups%2F{resourceGroupName}" +
                        $"%2Fproviders%2FMicrosoft.Resources%2Fdeployments%2F{deploymentName}";

        return new DeploymentResult(
            operation.Id?.ToString() ?? deploymentName,
            deploymentName,
            "Running",
            portalUrl);
    }

    public async Task<DeploymentStatusSnapshot> GetStatusAsync(
        string accessToken,
        string subscriptionId,
        string resourceGroupName,
        string deploymentName,
        CancellationToken cancellationToken = default)
    {
        var client = new ArmClient(new StaticTokenCredential(accessToken));

        var deploymentId = new ResourceIdentifier(
            $"/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}" +
            $"/providers/Microsoft.Resources/deployments/{deploymentName}");
        var deployment = client.GetArmDeploymentResource(deploymentId);
        var data = (await deployment.GetAsync(cancellationToken)).Value.Data;

        // Deployment operations API varies across SDK versions — use the
        // overall provisioning state and output resources from the template.
        var resources = new List<DeploymentResourceStatus>();

        return new DeploymentStatusSnapshot(
            data.Properties?.ProvisioningState?.ToString() ?? "Unknown",
            resources,
            data.Properties?.Error?.Message,
            data.Properties?.Timestamp ?? DateTimeOffset.UtcNow);
    }

    /// <summary>
    /// Build a simplified ARM JSON template from the diagram.
    /// This is a placeholder — in production, you'd compile the generated Bicep to ARM.
    /// </summary>
    private static string BuildArmTemplate(DiagramExportDto diagram, string region)
    {
        var template = new
        {
            schema = "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
            contentVersion = "1.0.0.0",
            parameters = new Dictionary<string, object>
            {
                ["location"] = new { type = "string", defaultValue = region },
            },
            resources = BuildArmResources(diagram, region),
        };

        return JsonSerializer.Serialize(template, new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        });
    }

    private static List<object> BuildArmResources(DiagramExportDto diagram, string region)
    {
        var resources = new List<object>();

        // Map service types to ARM resource definitions
        var armMappings = Domain.ValueObjects.ArmResourceMapping.GetAll();

        foreach (var node in diagram.Nodes)
        {
            if (node.GroupType is "resource-group" or "virtual-network" or "subnet")
                continue;
            if (node.ServiceType is "resource-group" or "entra-id")
                continue;

            var serviceType = MapServiceTypeToEnum(node.ServiceType);
            if (serviceType is null) continue;

            var metadata = Domain.ValueObjects.ArmResourceMapping.GetMetadata(serviceType.Value);
            if (metadata is null) continue;

            var safeName = node.DisplayName
                .Replace(" ", "-")
                .ToLowerInvariant();
            safeName = System.Text.RegularExpressions.Regex.Replace(safeName, @"[^a-z0-9\-]", "");

            var resource = new Dictionary<string, object>
            {
                ["type"] = metadata.ResourceType,
                ["apiVersion"] = metadata.ApiVersion,
                ["name"] = safeName,
                ["location"] = "[parameters('location')]",
                ["properties"] = new Dictionary<string, object>(),
            };

            if (metadata.Kind is not null)
                resource["kind"] = metadata.Kind;

            resources.Add(resource);
        }

        return resources;
    }

    private static Domain.ValueObjects.AzureServiceType? MapServiceTypeToEnum(string kebabCase)
    {
        return kebabCase switch
        {
            "app-service" => Domain.ValueObjects.AzureServiceType.AppService,
            "function-app" => Domain.ValueObjects.AzureServiceType.FunctionApp,
            "virtual-machine" => Domain.ValueObjects.AzureServiceType.VirtualMachine,
            "container-apps" => Domain.ValueObjects.AzureServiceType.ContainerApps,
            "aks" => Domain.ValueObjects.AzureServiceType.Aks,
            "azure-sql" => Domain.ValueObjects.AzureServiceType.AzureSql,
            "cosmos-db" => Domain.ValueObjects.AzureServiceType.CosmosDb,
            "storage-account" => Domain.ValueObjects.AzureServiceType.StorageAccount,
            "redis-cache" => Domain.ValueObjects.AzureServiceType.RedisCache,
            "virtual-network" => Domain.ValueObjects.AzureServiceType.VirtualNetwork,
            "application-gateway" => Domain.ValueObjects.AzureServiceType.ApplicationGateway,
            "load-balancer" => Domain.ValueObjects.AzureServiceType.LoadBalancer,
            "front-door" => Domain.ValueObjects.AzureServiceType.FrontDoor,
            "key-vault" => Domain.ValueObjects.AzureServiceType.KeyVault,
            "api-management" => Domain.ValueObjects.AzureServiceType.ApiManagement,
            "service-bus" => Domain.ValueObjects.AzureServiceType.ServiceBus,
            "event-hub" => Domain.ValueObjects.AzureServiceType.EventHub,
            "azure-openai" => Domain.ValueObjects.AzureServiceType.AzureOpenAi,
            "log-analytics" => Domain.ValueObjects.AzureServiceType.LogAnalytics,
            "application-insights" => Domain.ValueObjects.AzureServiceType.ApplicationInsights,
            "ai-search" => Domain.ValueObjects.AzureServiceType.AiSearch,
            "ddos-protection" => Domain.ValueObjects.AzureServiceType.DdosProtection,
            "event-grid" => Domain.ValueObjects.AzureServiceType.EventGrid,
            "static-web-app" => Domain.ValueObjects.AzureServiceType.StaticWebApp,
            _ => null,
        };
    }
}
