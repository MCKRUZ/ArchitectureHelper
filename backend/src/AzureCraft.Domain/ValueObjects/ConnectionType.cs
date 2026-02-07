namespace AzureCraft.Domain.ValueObjects;

/// <summary>
/// Connection types between Azure services.
/// </summary>
public enum ConnectionType
{
    PrivateEndpoint,
    VnetIntegration,
    Public,
    ServiceEndpoint,
    Peering
}
