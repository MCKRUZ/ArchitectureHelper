using AzureCraft.Application.Interfaces;
using MediatR;
using Microsoft.Extensions.Logging;

namespace AzureCraft.Application.Diagrams.Queries.GetDiagram;

/// <summary>
/// Handler for getting a diagram by ID.
/// </summary>
public sealed class GetDiagramQueryHandler : IRequestHandler<GetDiagramQuery, DiagramDto?>
{
    #region Variables

    private readonly IDiagramRepository _repository;
    private readonly ILogger<GetDiagramQueryHandler> _logger;

    #endregion

    #region Constructor

    public GetDiagramQueryHandler(
        IDiagramRepository repository,
        ILogger<GetDiagramQueryHandler> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    #endregion

    #region Public Methods

    public async Task<DiagramDto?> Handle(
        GetDiagramQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Getting diagram {DiagramId}", request.Id);

        var diagram = await _repository.GetByIdAsync(request.Id, cancellationToken);
        if (diagram is null)
        {
            _logger.LogWarning("Diagram {DiagramId} not found", request.Id);
            return null;
        }

        return new DiagramDto(
            diagram.Id,
            diagram.Name,
            diagram.Description,
            diagram.CreatedAt,
            diagram.ModifiedAt,
            diagram.Version,
            diagram.Nodes.Select(n => new NodeDto(
                n.Id,
                n.ServiceType.ToString(),
                n.DisplayName,
                n.Position.X,
                n.Position.Y,
                n.Sku,
                n.Region,
                n.MonthlyCost,
                n.Status.ToString())).ToList(),
            diagram.Edges.Select(e => new EdgeDto(
                e.Id,
                e.SourceNodeId,
                e.TargetNodeId,
                e.ConnectionType.ToString(),
                e.IsEncrypted,
                e.Label)).ToList());
    }

    #endregion
}
