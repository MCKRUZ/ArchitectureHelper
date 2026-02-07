using Ardalis.GuardClauses;
using AzureCraft.Domain.ValueObjects;

namespace AzureCraft.Domain.Entities;

/// <summary>
/// Represents an Azure service node in a diagram.
/// </summary>
public sealed class DiagramNode
{
    #region Properties

    public Guid Id { get; private set; }
    public Guid DiagramId { get; private set; }
    public AzureServiceType ServiceType { get; private set; }
    public string DisplayName { get; private set; } = null!;
    public Position Position { get; private set; } = null!;
    public string? Sku { get; private set; }
    public string? Region { get; private set; }
    public decimal MonthlyCost { get; private set; }
    public NodeStatus Status { get; private set; }
    public Dictionary<string, object> Properties { get; private set; } = null!;

    #endregion

    #region Constructor

    private DiagramNode() { } // EF Core

    public DiagramNode(
        Guid diagramId,
        AzureServiceType serviceType,
        string displayName,
        Position position)
    {
        Guard.Against.Default(diagramId, nameof(diagramId));
        Guard.Against.NullOrWhiteSpace(displayName, nameof(displayName));
        Guard.Against.Null(position, nameof(position));

        Id = Guid.NewGuid();
        DiagramId = diagramId;
        ServiceType = serviceType;
        DisplayName = displayName;
        Position = position;
        Status = NodeStatus.Proposed;
        Properties = [];
    }

    #endregion

    #region Public Methods

    public void UpdateDisplayName(string displayName)
    {
        Guard.Against.NullOrWhiteSpace(displayName, nameof(displayName));
        DisplayName = displayName;
    }

    public void UpdatePosition(Position position)
    {
        Guard.Against.Null(position, nameof(position));
        Position = position;
    }

    public void UpdateSku(string? sku)
    {
        Sku = sku;
    }

    public void UpdateRegion(string? region)
    {
        Region = region;
    }

    public void UpdateMonthlyCost(decimal cost)
    {
        Guard.Against.Negative(cost, nameof(cost));
        MonthlyCost = cost;
    }

    public void UpdateStatus(NodeStatus status)
    {
        Status = status;
    }

    public void SetProperty(string key, object value)
    {
        Guard.Against.NullOrWhiteSpace(key, nameof(key));
        Properties[key] = value;
    }

    #endregion
}
