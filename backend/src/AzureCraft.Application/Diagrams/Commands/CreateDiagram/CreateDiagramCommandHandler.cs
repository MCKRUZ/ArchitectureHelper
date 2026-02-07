using AzureCraft.Application.Interfaces;
using AzureCraft.Domain.Entities;
using MediatR;
using Microsoft.Extensions.Logging;

namespace AzureCraft.Application.Diagrams.Commands.CreateDiagram;

/// <summary>
/// Handler for creating a new diagram.
/// </summary>
public sealed class CreateDiagramCommandHandler : IRequestHandler<CreateDiagramCommand, CreateDiagramResult>
{
    #region Variables

    private readonly IDiagramRepository _repository;
    private readonly ILogger<CreateDiagramCommandHandler> _logger;

    #endregion

    #region Constructor

    public CreateDiagramCommandHandler(
        IDiagramRepository repository,
        ILogger<CreateDiagramCommandHandler> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    #endregion

    #region Public Methods

    public async Task<CreateDiagramResult> Handle(
        CreateDiagramCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Creating diagram with name {DiagramName}", request.Name);

        var diagram = new Diagram(request.Name, request.Description);
        await _repository.AddAsync(diagram, cancellationToken);

        _logger.LogInformation("Created diagram {DiagramId}", diagram.Id);

        return new CreateDiagramResult(
            diagram.Id,
            diagram.Name,
            diagram.CreatedAt);
    }

    #endregion
}
