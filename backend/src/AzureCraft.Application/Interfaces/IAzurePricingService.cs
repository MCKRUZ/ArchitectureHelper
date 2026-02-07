using AzureCraft.Domain.ValueObjects;

namespace AzureCraft.Application.Interfaces;

/// <summary>
/// Service interface for Azure pricing calculations.
/// </summary>
public interface IAzurePricingService
{
    Task<decimal> GetEstimatedMonthlyCostAsync(
        AzureServiceType serviceType,
        string? sku,
        string? region,
        CancellationToken cancellationToken = default);

    Task<Dictionary<AzureServiceType, decimal>> GetBulkPricingAsync(
        IEnumerable<(AzureServiceType ServiceType, string? Sku, string? Region)> services,
        CancellationToken cancellationToken = default);
}
