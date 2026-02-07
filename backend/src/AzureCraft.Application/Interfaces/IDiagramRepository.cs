using AzureCraft.Domain.Entities;

namespace AzureCraft.Application.Interfaces;

/// <summary>
/// Repository interface for diagram persistence.
/// </summary>
public interface IDiagramRepository
{
    Task<Diagram?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Diagram>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Diagram> AddAsync(Diagram diagram, CancellationToken cancellationToken = default);
    Task UpdateAsync(Diagram diagram, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
