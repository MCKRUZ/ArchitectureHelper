using AzureCraft.Application.Azure;
using AzureCraft.Application.Bicep.Services;
using AzureCraft.Application.Deploy;
using AzureCraft.Infrastructure.Azure;
using AzureCraft.Infrastructure.Bicep;
using AzureCraft.Infrastructure.Bicep.Modules;
using AzureCraft.Infrastructure.Deploy;
using Microsoft.Extensions.DependencyInjection;

namespace AzureCraft.Infrastructure;

/// <summary>
/// Dependency injection extensions for the Infrastructure layer.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        // Azure management
        services.AddScoped<IAzureManagementService, AzureManagementService>();
        services.AddScoped<IDeploymentService, DeploymentService>();

        // Bicep generation
        services.AddSingleton<IBicepGenerator, BicepGenerator>();
        services.AddBicepModules();

        return services;
    }

    private static void AddBicepModules(this IServiceCollection services)
    {
        // Compute
        services.AddSingleton<IBicepModule, AppServiceModule>();
        services.AddSingleton<IBicepModule, FunctionAppModule>();
        services.AddSingleton<IBicepModule, VirtualMachineModule>();
        services.AddSingleton<IBicepModule, ContainerAppsModule>();
        services.AddSingleton<IBicepModule, AksModule>();
        services.AddSingleton<IBicepModule, StaticWebAppModule>();

        // Databases & Storage
        services.AddSingleton<IBicepModule, AzureSqlModule>();
        services.AddSingleton<IBicepModule, CosmosDbModule>();
        services.AddSingleton<IBicepModule, RedisCacheModule>();
        services.AddSingleton<IBicepModule, StorageAccountModule>();

        // Networking
        services.AddSingleton<IBicepModule, VirtualNetworkModule>();
        services.AddSingleton<IBicepModule, ApplicationGatewayModule>();
        services.AddSingleton<IBicepModule, LoadBalancerModule>();
        services.AddSingleton<IBicepModule, FrontDoorModule>();
        services.AddSingleton<IBicepModule, DdosProtectionModule>();

        // Security & Identity
        services.AddSingleton<IBicepModule, KeyVaultModule>();
        services.AddSingleton<IBicepModule, EntraIdModule>();

        // Integration
        services.AddSingleton<IBicepModule, ApiManagementModule>();
        services.AddSingleton<IBicepModule, ServiceBusModule>();
        services.AddSingleton<IBicepModule, EventHubModule>();
        services.AddSingleton<IBicepModule, EventGridModule>();

        // AI
        services.AddSingleton<IBicepModule, AzureOpenAiModule>();
        services.AddSingleton<IBicepModule, AiSearchModule>();

        // Management
        services.AddSingleton<IBicepModule, LogAnalyticsModule>();
        services.AddSingleton<IBicepModule, ApplicationInsightsModule>();
    }
}
