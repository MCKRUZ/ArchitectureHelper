using AzureCraft.Domain.Entities;
using AzureCraft.Domain.ValueObjects;
using FluentAssertions;
using Xunit;

namespace AzureCraft.Domain.Tests.Entities;

public class DiagramTests
{
    [Fact]
    public void Constructor_WithValidName_CreatesDiagram()
    {
        // Arrange & Act
        var diagram = new Diagram("Test Diagram", "Description");

        // Assert
        diagram.Id.Should().NotBeEmpty();
        diagram.Name.Should().Be("Test Diagram");
        diagram.Description.Should().Be("Description");
        diagram.Version.Should().Be(1);
        diagram.Nodes.Should().BeEmpty();
        diagram.Edges.Should().BeEmpty();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Constructor_WithInvalidName_ThrowsException(string? name)
    {
        // Act
        var act = () => new Diagram(name!);

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void UpdateName_IncrementsVersion()
    {
        // Arrange
        var diagram = new Diagram("Original");
        var initialVersion = diagram.Version;

        // Act
        diagram.UpdateName("Updated");

        // Assert
        diagram.Name.Should().Be("Updated");
        diagram.Version.Should().Be(initialVersion + 1);
    }

    [Fact]
    public void AddNode_AddsNodeAndIncrementsVersion()
    {
        // Arrange
        var diagram = new Diagram("Test");
        var node = new DiagramNode(
            diagram.Id,
            AzureServiceType.AppService,
            "My App",
            new Position(100, 200));
        var initialVersion = diagram.Version;

        // Act
        diagram.AddNode(node);

        // Assert
        diagram.Nodes.Should().Contain(node);
        diagram.Version.Should().Be(initialVersion + 1);
    }

    [Fact]
    public void RemoveNode_RemovesConnectedEdges()
    {
        // Arrange
        var diagram = new Diagram("Test");
        var node1 = new DiagramNode(diagram.Id, AzureServiceType.AppService, "App", new Position(0, 0));
        var node2 = new DiagramNode(diagram.Id, AzureServiceType.AzureSql, "DB", new Position(100, 0));
        var edge = new DiagramEdge(diagram.Id, node1.Id, node2.Id);

        diagram.AddNode(node1);
        diagram.AddNode(node2);
        diagram.AddEdge(edge);

        // Act
        diagram.RemoveNode(node1.Id);

        // Assert
        diagram.Nodes.Should().NotContain(node1);
        diagram.Edges.Should().BeEmpty();
    }
}
