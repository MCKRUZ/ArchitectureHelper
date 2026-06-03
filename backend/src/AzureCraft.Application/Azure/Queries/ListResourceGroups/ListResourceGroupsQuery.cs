using MediatR;

namespace AzureCraft.Application.Azure.Queries.ListResourceGroups;

/// <summary>
/// Query to list resource groups in an Azure subscription.
/// </summary>
public sealed record ListResourceGroupsQuery(string AccessToken, string SubscriptionId)
    : IRequest<IReadOnlyList<ResourceGroupDto>>;

public sealed class ListResourceGroupsQueryHandler(IAzureManagementService azureService)
    : IRequestHandler<ListResourceGroupsQuery, IReadOnlyList<ResourceGroupDto>>
{
    public Task<IReadOnlyList<ResourceGroupDto>> Handle(
        ListResourceGroupsQuery request, CancellationToken cancellationToken) =>
        azureService.ListResourceGroupsAsync(
            request.AccessToken, request.SubscriptionId, cancellationToken);
}
