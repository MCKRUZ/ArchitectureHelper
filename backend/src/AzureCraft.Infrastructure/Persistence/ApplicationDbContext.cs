using AzureCraft.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AzureCraft.Infrastructure.Persistence;

/// <summary>
/// Entity Framework Core database context.
/// </summary>
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Diagram> Diagrams => Set<Diagram>();
    public DbSet<DiagramNode> Nodes => Set<DiagramNode>();
    public DbSet<DiagramEdge> Edges => Set<DiagramEdge>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
