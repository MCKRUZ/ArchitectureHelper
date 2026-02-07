using Ardalis.GuardClauses;

namespace AzureCraft.Domain.Entities;

/// <summary>
/// Represents an Azure architecture diagram.
/// </summary>
public sealed class Diagram
{
    #region Properties

    public Guid Id { get; private set; }
    public string Name { get; private set; } = null!;
    public string? Description { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime ModifiedAt { get; private set; }
    public int Version { get; private set; }

    private readonly List<DiagramNode> _nodes = [];
    public IReadOnlyList<DiagramNode> Nodes => _nodes.AsReadOnly();

    private readonly List<DiagramEdge> _edges = [];
    public IReadOnlyList<DiagramEdge> Edges => _edges.AsReadOnly();

    #endregion

    #region Constructor

    private Diagram() { } // EF Core

    public Diagram(string name, string? description = null)
    {
        Guard.Against.NullOrWhiteSpace(name, nameof(name));

        Id = Guid.NewGuid();
        Name = name;
        Description = description;
        CreatedAt = DateTime.UtcNow;
        ModifiedAt = DateTime.UtcNow;
        Version = 1;
    }

    #endregion

    #region Public Methods

    public void UpdateName(string name)
    {
        Guard.Against.NullOrWhiteSpace(name, nameof(name));
        Name = name;
        IncrementVersion();
    }

    public void UpdateDescription(string? description)
    {
        Description = description;
        IncrementVersion();
    }

    public void AddNode(DiagramNode node)
    {
        Guard.Against.Null(node, nameof(node));
        _nodes.Add(node);
        IncrementVersion();
    }

    public void RemoveNode(Guid nodeId)
    {
        var node = _nodes.Find(n => n.Id == nodeId);
        if (node is not null)
        {
            _nodes.Remove(node);
            // Remove connected edges
            _edges.RemoveAll(e => e.SourceNodeId == nodeId || e.TargetNodeId == nodeId);
            IncrementVersion();
        }
    }

    public void AddEdge(DiagramEdge edge)
    {
        Guard.Against.Null(edge, nameof(edge));
        _edges.Add(edge);
        IncrementVersion();
    }

    public void RemoveEdge(Guid edgeId)
    {
        var edge = _edges.Find(e => e.Id == edgeId);
        if (edge is not null)
        {
            _edges.Remove(edge);
            IncrementVersion();
        }
    }

    #endregion

    #region Private Methods

    private void IncrementVersion()
    {
        Version++;
        ModifiedAt = DateTime.UtcNow;
    }

    #endregion
}
