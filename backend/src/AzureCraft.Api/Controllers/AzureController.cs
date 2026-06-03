using AzureCraft.Application.Azure.Queries.ListResourceGroups;
using AzureCraft.Application.Azure.Queries.ListSubscriptions;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AzureCraft.Api.Controllers;

/// <summary>
/// API controller for Azure subscription and resource browsing.
/// Requires authentication — the user's Bearer token is forwarded to Azure APIs.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AzureController(IMediator mediator) : ControllerBase
{
    /// <summary>List accessible Azure subscriptions.</summary>
    [HttpGet("subscriptions")]
    public async Task<IActionResult> ListSubscriptions(CancellationToken cancellationToken)
    {
        var token = ExtractBearerToken();
        if (token is null) return Unauthorized("Missing Bearer token.");

        var result = await mediator.Send(
            new ListSubscriptionsQuery(token), cancellationToken);
        return Ok(result);
    }

    /// <summary>List resource groups in a subscription.</summary>
    [HttpGet("subscriptions/{subscriptionId}/resource-groups")]
    public async Task<IActionResult> ListResourceGroups(
        string subscriptionId, CancellationToken cancellationToken)
    {
        var token = ExtractBearerToken();
        if (token is null) return Unauthorized("Missing Bearer token.");

        var result = await mediator.Send(
            new ListResourceGroupsQuery(token, subscriptionId), cancellationToken);
        return Ok(result);
    }

    private string? ExtractBearerToken()
    {
        var auth = Request.Headers.Authorization.ToString();
        if (string.IsNullOrEmpty(auth) || !auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return null;
        return auth["Bearer ".Length..];
    }
}
