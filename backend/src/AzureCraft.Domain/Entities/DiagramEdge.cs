using Ardalis.GuardClauses;
using AzureCraft.Domain.ValueObjects;

namespace AzureCraft.Domain.Entities;

/// <summary>
/// Represents a connection between two nodes in a diagram.
/// </summary>
public sealed class DiagramEdge
{
    #region Properties

    public Guid Id { get; private set; }
    public Guid DiagramId { get; private set; }
    public Guid SourceNodeId { get; private set; }
    public Guid TargetNodeId { get; private set; }
    public ConnectionType ConnectionType { get; private set; }
    public string? Protocol { get; private set; }
    public int? Port { get; private set; }
    public bool IsEncrypted { get; private set; }
    public string? Label { get; private set; }

    #endregion

    #region Constructor

    private DiagramEdge() { } // EF Core

    public DiagramEdge(
        Guid diagramId,
        Guid sourceNodeId,
        Guid targetNodeId,
        ConnectionType connectionType = ConnectionType.Public,
        bool isEncrypted = true)
    {
        Guard.Against.Default(diagramId, nameof(diagramId));
        Guard.Against.Default(sourceNodeId, nameof(sourceNodeId));
        Guard.Against.Default(targetNodeId, nameof(targetNodeId));

        if (sourceNodeId == targetNodeId)
        {
            throw new ArgumentException("Source and target nodes must be different.");
        }

        Id = Guid.NewGuid();
        DiagramId = diagramId;
        SourceNodeId = sourceNodeId;
        TargetNodeId = targetNodeId;
        ConnectionType = connectionType;
        IsEncrypted = isEncrypted;
    }

    #endregion

    #region Public Methods

    public void UpdateConnectionType(ConnectionType connectionType)
    {
        ConnectionType = connectionType;
    }

    public void UpdateProtocol(string? protocol, int? port)
    {
        Protocol = protocol;
        Port = port;
    }

    public void UpdateEncryption(bool isEncrypted)
    {
        IsEncrypted = isEncrypted;
    }

    public void UpdateLabel(string? label)
    {
        Label = label;
    }

    #endregion
}
