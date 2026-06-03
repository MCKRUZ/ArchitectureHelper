using FluentValidation;

namespace AzureCraft.Application.Deploy.Commands.DeployDiagram;

public sealed class DeployDiagramCommandValidator : AbstractValidator<DeployDiagramCommand>
{
    public DeployDiagramCommandValidator()
    {
        RuleFor(x => x.AccessToken).NotEmpty();
        RuleFor(x => x.SubscriptionId).NotEmpty();
        RuleFor(x => x.ResourceGroupName).NotEmpty();
        RuleFor(x => x.Region).NotEmpty();
        RuleFor(x => x.Diagram).NotNull();
        RuleFor(x => x.Diagram.Nodes).NotEmpty()
            .WithMessage("Cannot deploy an empty diagram.");
    }
}
