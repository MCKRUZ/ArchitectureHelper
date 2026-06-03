using AzureCraft.Application.Bicep.Commands.GenerateBicep;
using AzureCraft.Application.Bicep.Dtos;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AzureCraft.Api.Controllers;

/// <summary>
/// API controller for Bicep generation and export.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class BicepController(IMediator mediator, ILogger<BicepController> logger) : ControllerBase
{
    /// <summary>
    /// Generate Bicep files from a diagram.
    /// Returns either a zip file or a JSON preview depending on the format query parameter.
    /// </summary>
    [HttpPost("generate")]
    [ProducesResponseType(typeof(BicepPreviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Generate(
        [FromBody] DiagramExportDto diagram,
        [FromQuery] string format = "preview",
        CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "Bicep generation requested for '{DiagramName}' (format={Format})",
            diagram.DiagramName, format);

        var command = new GenerateBicepCommand(diagram, format);
        var result = await mediator.Send(command, cancellationToken);

        if (format == "zip" && result.ZipBytes is not null)
        {
            var fileName = $"{diagram.DiagramName.Replace(" ", "-").ToLowerInvariant()}-bicep.zip";
            return File(result.ZipBytes, "application/zip", fileName);
        }

        // Preview: return file list as JSON
        var preview = new BicepPreviewResponse(
            result.Files.Select(f => new BicepPreviewFile(f.Path, f.Content)).ToList());
        return Ok(preview);
    }
}

/// <summary>
/// JSON response for Bicep preview mode.
/// </summary>
public sealed record BicepPreviewResponse(IReadOnlyList<BicepPreviewFile> Files);

/// <summary>
/// A single file in the Bicep preview.
/// </summary>
public sealed record BicepPreviewFile(string Path, string Content);
