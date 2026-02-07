using AzureCraft.Application.Diagrams.Commands.CreateDiagram;
using AzureCraft.Application.Diagrams.Queries.GetDiagram;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AzureCraft.Api.Controllers;

/// <summary>
/// API controller for diagram operations.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class DiagramsController : ControllerBase
{
    #region Variables

    private readonly IMediator _mediator;
    private readonly ILogger<DiagramsController> _logger;

    #endregion

    #region Constructor

    public DiagramsController(IMediator mediator, ILogger<DiagramsController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    #endregion

    #region Public Methods

    /// <summary>
    /// Get a diagram by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(DiagramDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetDiagramQuery(id), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>
    /// Create a new diagram.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(CreateDiagramResult), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(
        [FromBody] CreateDiagramRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreateDiagramCommand(request.Name, request.Description);
        var result = await _mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    #endregion
}

/// <summary>
/// Request model for creating a diagram.
/// </summary>
public sealed record CreateDiagramRequest(string Name, string? Description = null);
