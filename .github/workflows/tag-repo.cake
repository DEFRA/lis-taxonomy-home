using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

var target = Argument("target", "Default");

const string GitUserName = "lis-release-tagger[bot]";
const string GitUserEmail = "lis-release-tagger[bot]@users.noreply.github.com";

string GetRequiredEnvironmentVariable(string name)
{
    var value = EnvironmentVariable(name);

    if (string.IsNullOrWhiteSpace(value))
    {
        throw new Exception($"Environment variable '{name}' is required.");
    }

    return value;
}

IReadOnlyCollection<string> RunGit(string arguments)
{
    IEnumerable<string> output;
    IEnumerable<string> error;

    var exitCode = StartProcess(
        "git",
        new ProcessSettings
        {
            Arguments = arguments,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        },
        out output,
        out error);

    var outputLines = output.ToList();
    var errorLines = error.ToList();

    foreach (var line in outputLines)
    {
        Information(line);
    }

    if (exitCode != 0)
    {
        foreach (var line in errorLines)
        {
            Error(line);
        }

        throw new Exception($"git {arguments} failed with exit code {exitCode}.");
    }

    return outputLines;
}

bool GitTagExists(string tag)
{
    var exitCode = StartProcess(
        "git",
        new ProcessSettings
        {
            Arguments = $"rev-parse -q --verify refs/tags/{tag}",
            RedirectStandardOutput = true,
            RedirectStandardError = true
        });

    return exitCode == 0;
}

void WriteGitHubOutput(string name, string value)
{
    var outputPath = EnvironmentVariable("GITHUB_OUTPUT");

    if (!string.IsNullOrWhiteSpace(outputPath))
    {
        System.IO.File.AppendAllText(outputPath, $"{name}={value}{Environment.NewLine}");
    }
}

(string BranchName, string StoryId, string BumpType) ResolveBranchContext()
{
    var eventName = GetRequiredEnvironmentVariable("GITHUB_EVENT_NAME");
    var branchName = Argument("branch", string.Empty);

    if (string.IsNullOrWhiteSpace(branchName))
    {
        branchName = eventName.Equals("pull_request", StringComparison.OrdinalIgnoreCase)
            ? EnvironmentVariable("GITHUB_HEAD_REF")
            : EnvironmentVariable("GITHUB_REF_NAME");
    }

    if (string.IsNullOrWhiteSpace(branchName))
    {
        throw new Exception("Unable to determine the branch name.");
    }

    branchName = branchName.ToLowerInvariant();

    var hotfixMatch = Regex.Match(branchName, @"^hotfix/([a-z]+-[0-9]+)-.+$");
    if (hotfixMatch.Success)
    {
        return (branchName, hotfixMatch.Groups[1].Value, "patch");
    }

    var featureMatch = Regex.Match(branchName, @"^feature/([a-z]+-[0-9]+)-.+$");
    if (featureMatch.Success)
    {
        return (branchName, featureMatch.Groups[1].Value, "minor");
    }

    throw new Exception($"Branch '{branchName}' does not have the correct name.");
}

(string Tag, string Message) CalculateNextTag(string eventName, string branchName, string storyId, string bumpType)
{
    RunGit("fetch --force --tags");
    RunGit("fetch --force origin main");

    var latestMainTag = RunGit("tag --sort=-v:refname")
        .FirstOrDefault(line => Regex.IsMatch(line, @"^[0-9]+\.[0-9]+\.[0-9]+$"));

    var major = 0;
    var minor = 0;
    var patch = 0;

    if (!string.IsNullOrWhiteSpace(latestMainTag))
    {
        var parts = latestMainTag.Split('.');
        major = int.Parse(parts[0]);
        minor = int.Parse(parts[1]);
        patch = int.Parse(parts[2]);
    }

    if (bumpType.Equals("minor", StringComparison.OrdinalIgnoreCase))
    {
        minor += 1;
        patch = 0;
    }
    else
    {
        patch += 1;
    }

    var baseVersion = $"{major}.{minor}.{patch}";

    if (eventName.Equals("push", StringComparison.OrdinalIgnoreCase))
    {
        var mergeBase = RunGit("merge-base HEAD origin/main").First();
        var depth = RunGit($"rev-list --count {mergeBase}..HEAD").First();
        var nextTag = $"{baseVersion}-{storyId}-alpha.{depth}";
        var message = $"Repository branch build {nextTag} from {branchName}";

        return (nextTag, message);
    }

    return (baseVersion, $"Repository release {baseVersion} from {branchName}");
}

Task("Default")
    .Does(() =>
    {
        var eventName = GetRequiredEnvironmentVariable("GITHUB_EVENT_NAME");
        var branchContext = ResolveBranchContext();

        Information($"Resolved branch '{branchContext.BranchName}' with story '{branchContext.StoryId}' and bump '{branchContext.BumpType}'.");

        WriteGitHubOutput("STORY_ID", branchContext.StoryId);
        WriteGitHubOutput("BUMP_TYPE", branchContext.BumpType);
        WriteGitHubOutput("BRANCH_NAME", branchContext.BranchName);

        var version = CalculateNextTag(
            eventName,
            branchContext.BranchName,
            branchContext.StoryId,
            branchContext.BumpType);

        Information($"Calculated tag '{version.Tag}'.");
        Information($"Tag message: {version.Message}");

        WriteGitHubOutput("tag", version.Tag);
        WriteGitHubOutput("message", version.Message);

        if (GitTagExists(version.Tag))
        {
            throw new Exception($"Tag '{version.Tag}' already exists.");
        }

        RunGit($"config user.name \"{GitUserName}\"");
        RunGit($"config user.email \"{GitUserEmail}\"");
        RunGit($"tag -a {version.Tag} -m \"{version.Message}\"");
        RunGit($"push origin refs/tags/{version.Tag}");
    });

RunTarget(target);
