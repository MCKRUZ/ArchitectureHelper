using AzureCraft.Application.Bicep.Dtos;
using AzureCraft.Application.Deploy;
using AzureCraft.Application.Deploy.Commands.DeployDiagram;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AzureCraft.Api.Controllers;

/// <summary>
/// API controller for deploying diagrams to Azure.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DeployController(
    IMediator mediator,
    IDeploymentService deploymentService) : ControllerBase
{
    /// <summary>
    /// Deploy a diagram to Azure.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(DeploymentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Deploy(
        [FromBody] DeployRequest request,
        CancellationToken cancellationToken)
    {
        var token = ExtractBearerToken();
        if (token is null) return Unauthorized("Missing Bearer token.");

        var command = new DeployDiagramCommand(
            token,
            request.SubscriptionId,
            request.ResourceGroupName,
            request.Region,
            request.Diagram);

        var result = await mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Get deployment status (SSE stream).
    /// </summary>
    [HttpGet("{deploymentName}/status")]
    [Produces("text/event-stream")]
    public async Task Status(
        string deploymentName,
        [FromQuery] string subscriptionId,
        [FromQuery] string resourceGroupName,
        CancellationToken cancellationToken)
    {
        var token = ExtractBearerToken();
        if (token is null)
        {
            Response.StatusCode = 401;
            return;
        }

        Response.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";

        var isTerminal = false;
        while (!cancellationToken.IsCancellationRequested && !isTerminal)
        {
            var status = await deploymentService.GetStatusAsync(
                token, subscriptionId, resourceGroupName, deploymentName, cancellationToken);

            var json = System.Text.Json.JsonSerializer.Serialize(status,
                new System.Text.Json.JsonSerializerOptions
                {
                    PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                });

            await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);

            isTerminal = status.ProvisioningState is
                "Succeeded" or "Failed" or "Canceled";

            if (!isTerminal)
                await Task.Delay(3000, cancellationToken);
        }
    }

    private string? ExtractBearerToken()
    {
        var auth = Request.Headers.Authorization.ToString();
        if (string.IsNullOrEmpty(auth) || !auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return null;
        return auth["Bearer ".Length..];
    }
}

/// <summary>
/// Request body for deploying a diagram.
/// </summary>
public sealed record DeployRequest(
    string SubscriptionId,
    string ResourceGroupName,
    string Region,
    DiagramExportDto Diagram);
