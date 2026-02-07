using AzureCraft.Application.Interfaces;
using AzureCraft.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AzureCraft.Infrastructure.Persistence;

/// <summary>
/// EF Core implementation of IDiagramRepository.
/// </summary>
public sealed class DiagramRepository : IDiagramRepository
{
    #region Variables

    private readonly ApplicationDbContext _context;

    #endregion

    #region Constructor

    public DiagramRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    #endregion

    #region Public Methods

    public async Task<Diagram?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Diagrams
            .Include(d => d.Nodes)
            .Include(d => d.Edges)
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<Diagram>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Diagrams
            .AsNoTracking()
            .OrderByDescending(d => d.ModifiedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<Diagram> AddAsync(Diagram diagram, CancellationToken cancellationToken = default)
    {
        _context.Diagrams.Add(diagram);
        await _context.SaveChangesAsync(cancellationToken);
        return diagram;
    }

    public async Task UpdateAsync(Diagram diagram, CancellationToken cancellationToken = default)
    {
        _context.Diagrams.Update(diagram);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var diagram = await _context.Diagrams.FindAsync([id], cancellationToken);
        if (diagram is not null)
        {
            _context.Diagrams.Remove(diagram);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    #endregion
}
