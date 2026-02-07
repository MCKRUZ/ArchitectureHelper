using FluentValidation;

namespace AzureCraft.Application.Diagrams.Commands.CreateDiagram;

/// <summary>
/// Validator for CreateDiagramCommand.
/// </summary>
public sealed class CreateDiagramCommandValidator : AbstractValidator<CreateDiagramCommand>
{
    public CreateDiagramCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .WithMessage("Diagram name is required.")
            .MaximumLength(200)
            .WithMessage("Diagram name must be under 200 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(2000)
            .WithMessage("Description must be under 2000 characters.")
            .When(x => x.Description is not null);
    }
}
