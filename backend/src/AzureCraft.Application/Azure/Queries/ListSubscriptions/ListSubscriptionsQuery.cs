using MediatR;

namespace AzureCraft.Application.Azure.Queries.ListSubscriptions;

/// <summary>
/// Query to list Azure subscriptions accessible to the authenticated user.
/// </summary>
public sealed record ListSubscriptionsQuery(string AccessToken)
    : IRequest<IReadOnlyList<SubscriptionDto>>;

public sealed class ListSubscriptionsQueryHandler(IAzureManagementService azureService)
    : IRequestHandler<ListSubscriptionsQuery, IReadOnlyList<SubscriptionDto>>
{
    public Task<IReadOnlyList<SubscriptionDto>> Handle(
        ListSubscriptionsQuery request, CancellationToken cancellationToken) =>
        azureService.ListSubscriptionsAsync(request.AccessToken, cancellationToken);
}
