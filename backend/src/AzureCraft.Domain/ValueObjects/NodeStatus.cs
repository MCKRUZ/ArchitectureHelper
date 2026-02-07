namespace AzureCraft.Domain.ValueObjects;

/// <summary>
/// Status of a diagram node.
/// </summary>
public enum NodeStatus
{
    Proposed,
    Healthy,
    Warning,
    Error
}
