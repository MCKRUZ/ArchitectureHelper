using AzureCraft.Application.Diagrams.Commands.CreateDiagram;
using AzureCraft.Application.Interfaces;
using AzureCraft.Domain.Entities;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AzureCraft.Application.Tests.Diagrams;

public class CreateDiagramCommandTests
{
    private readonly Mock<IDiagramRepository> _repositoryMock;
    private readonly Mock<ILogger<CreateDiagramCommandHandler>> _loggerMock;
    private readonly CreateDiagramCommandHandler _handler;

    public CreateDiagramCommandTests()
    {
        _repositoryMock = new Mock<IDiagramRepository>();
        _loggerMock = new Mock<ILogger<CreateDiagramCommandHandler>>();
        _handler = new CreateDiagramCommandHandler(_repositoryMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task Handle_WithValidCommand_CreatesDiagram()
    {
        // Arrange
        var command = new CreateDiagramCommand("Test Diagram", "Description");
        _repositoryMock
            .Setup(r => r.AddAsync(It.IsAny<Diagram>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Diagram d, CancellationToken _) => d);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().NotBeEmpty();
        result.Name.Should().Be("Test Diagram");
        _repositoryMock.Verify(r => r.AddAsync(It.IsAny<Diagram>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public void Validator_WithEmptyName_ReturnsError()
    {
        // Arrange
        var validator = new CreateDiagramCommandValidator();
        var command = new CreateDiagramCommand("");

        // Act
        var result = validator.Validate(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Name");
    }

    [Fact]
    public void Validator_WithValidName_Passes()
    {
        // Arrange
        var validator = new CreateDiagramCommandValidator();
        var command = new CreateDiagramCommand("Valid Name");

        // Act
        var result = validator.Validate(command);

        // Assert
        result.IsValid.Should().BeTrue();
    }
}
