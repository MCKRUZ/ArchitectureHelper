namespace AzureCraft.Domain.ValueObjects;

/// <summary>
/// Represents a 2D position on the canvas.
/// </summary>
public sealed record Position(double X, double Y)
{
    public static Position Zero => new(0, 0);

    public Position Offset(double dx, double dy) => new(X + dx, Y + dy);
}
