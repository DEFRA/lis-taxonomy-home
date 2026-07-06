using System;
using System.IO;
using System.Text.Json;

var target = Argument("target", "Default");

JsonDocument LoadPackageJson()
{
    var packageJson = File.ReadAllText("./package.json");
    return JsonDocument.Parse(packageJson);
}

bool HasNpmScript(string scriptName)
{
    using (var package = LoadPackageJson())
    {
        JsonElement scripts;
        if (!package.RootElement.TryGetProperty("scripts", out scripts))
        {
            return false;
        }

        JsonElement script;
        return scripts.TryGetProperty(scriptName, out script);
    }
}

void RunCommand(string fileName, ProcessArgumentBuilder arguments)
{
    var exitCode = StartProcess(
        fileName,
        new ProcessSettings
        {
            Arguments = arguments
        });

    if (exitCode != 0)
    {
        throw new Exception($"{fileName} command failed with exit code {exitCode}.");
    }
}

void RunNpmCommand(params string[] args)
{
    var arguments = new ProcessArgumentBuilder();

    foreach (var arg in args)
    {
        arguments.Append(arg);
    }

    RunCommand("npm", arguments);
}

void RunNpmScript(string scriptName, bool required = true)
{
    if (!HasNpmScript(scriptName))
    {
        if (required)
        {
            throw new Exception($"Required npm script '{scriptName}' is missing from package.json.");
        }

        Information($"Optional npm script '{scriptName}' is not defined. Skipping.");
        return;
    }

    Information($"Running npm script '{scriptName}'.");
    RunNpmCommand("run", scriptName);
}

Task("Install")
    .Does(() =>
    {
        Information("Installing npm dependencies with npm ci.");
        RunNpmCommand("ci");
    });

Task("BuildFrontend")
    .IsDependentOn("Install")
    .Does(() =>
    {
        RunNpmScript("build:frontend", required: false);
    });

Task("FormatCheck")
    .IsDependentOn("BuildFrontend")
    .Does(() =>
    {
        RunNpmScript("format:check");
    });

Task("Lint")
    .IsDependentOn("FormatCheck")
    .Does(() =>
    {
        RunNpmScript("lint");
    });

Task("Test")
    .IsDependentOn("Lint")
    .Does(() =>
    {
        RunNpmScript("test");
    });

Task("DockerBuild")
    .IsDependentOn("Test")
    .Does(() =>
    {
        if (!FileExists("./Dockerfile"))
        {
            Information("No Dockerfile found. Skipping Docker image build.");
            return;
        }

        Information("Dockerfile found. Building container image.");

        var arguments = new ProcessArgumentBuilder()
            .Append("build")
            .Append("--no-cache")
            .Append("--tag")
            .Append("test-build-container")
            .Append(".");

        RunCommand("docker", arguments);
    });

Task("Default")
    .IsDependentOn("DockerBuild");

RunTarget(target);
