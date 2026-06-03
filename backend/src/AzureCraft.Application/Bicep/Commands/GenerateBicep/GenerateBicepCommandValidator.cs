using FluentValidation;

namespace AzureCraft.Application.Bicep.Commands.GenerateBicep;

/// <summary>
/// Validates the GenerateBicepCommand before handling.
/// </summary>
public sealed class GenerateBicepCommandValidator : AbstractValidator<GenerateBicepCommand>
{
    public GenerateBicepCommandValidator()
    {
        RuleFor(x => x.Diagram).NotNull();
        RuleFor(x => x.Diagram.DiagramName)
            .NotEmpty()
            .MaximumLength(200);
        RuleFor(x => x.Diagram.Nodes)
            .NotEmpty()
            .WithMessage("Diagram must contain at least one node.");
        RuleFor(x => x.Format)
            .Must(f => f is "zip" or "preview")
            .WithMessage("Format must be 'zip' or 'preview'.");
    }
}
