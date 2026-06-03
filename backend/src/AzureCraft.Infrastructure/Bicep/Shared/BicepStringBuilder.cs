using System.Text;

namespace AzureCraft.Infrastructure.Bicep.Shared;

/// <summary>
/// Helper for building Bicep syntax with proper indentation.
/// </summary>
public sealed class BicepStringBuilder
{
    private readonly StringBuilder _sb = new();
    private int _indent;

    public BicepStringBuilder AppendLine(string line = "")
    {
        if (string.IsNullOrEmpty(line))
            _sb.AppendLine();
        else
            _sb.AppendLine($"{new string(' ', _indent * 2)}{line}");
        return this;
    }

    public BicepStringBuilder Append(string text)
    {
        _sb.Append($"{new string(' ', _indent * 2)}{text}");
        return this;
    }

    public BicepStringBuilder OpenBlock(string header)
    {
        AppendLine($"{header} {{");
        _indent++;
        return this;
    }

    public BicepStringBuilder CloseBlock()
    {
        _indent--;
        AppendLine("}");
        return this;
    }

    public BicepStringBuilder Param(string name, string type, string? defaultValue = null, string? description = null)
    {
        if (description is not null)
            AppendLine($"@description('{description}')");

        if (defaultValue is not null)
            AppendLine($"param {name} {type} = {defaultValue}");
        else
            AppendLine($"param {name} {type}");

        return this;
    }

    public BicepStringBuilder Property(string name, string value)
    {
        AppendLine($"{name}: {value}");
        return this;
    }

    public BicepStringBuilder StringProperty(string name, string value)
    {
        AppendLine($"{name}: '{value}'");
        return this;
    }

    public BicepStringBuilder Comment(string text)
    {
        AppendLine($"// {text}");
        return this;
    }

    public BicepStringBuilder Resource(string symbolName, string resourceType, string apiVersion, string name)
    {
        AppendLine($"resource {symbolName} '{resourceType}@{apiVersion}' = {{");
        _indent++;
        StringProperty("name", name);
        Property("location", "location");
        return this;
    }

    /// <summary>
    /// Generate a safe Bicep resource name from a display name.
    /// </summary>
    public static string SafeName(string displayName)
    {
        var safe = displayName
            .Replace(" ", "-")
            .Replace("_", "-")
            .ToLowerInvariant();

        // Remove non-alphanumeric characters except hyphens
        safe = System.Text.RegularExpressions.Regex.Replace(safe, @"[^a-z0-9\-]", "");

        // Ensure it doesn't start with a number
        if (safe.Length > 0 && char.IsDigit(safe[0]))
            safe = "r-" + safe;

        return string.IsNullOrEmpty(safe) ? "resource" : safe;
    }

    /// <summary>
    /// Generate a Bicep symbol name (camelCase, no hyphens).
    /// </summary>
    public static string SymbolName(string displayName)
    {
        var parts = SafeName(displayName).Split('-', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return "resource";

        return parts[0] + string.Join("",
            parts.Skip(1).Select(p => char.ToUpperInvariant(p[0]) + p[1..]));
    }

    public override string ToString() => _sb.ToString();
}
