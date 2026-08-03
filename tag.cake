#load "version.cake"

var target = Argument("target", "Default");
var tagVersion = Argument("tag_version", "");

if (string.IsNullOrEmpty(tagVersion)) {
    throw new CakeException("The '--tag_version' argument is required to run this build.");
}

bool GitTagExists(string value)
{
    return CommandSucceeds("git", $"rev-parse -q --verify refs/tags/{value}");
}

Task("CreateTag")
    .Description("Calculates the version, creates a Git tag, and pushes it")
    .Does(() => {
        var version = tagVersion;
        var tag = version;
        var message = $"Release version {version}";

        Information($"Calculated Version: {version}");

        if (GitTagExists(tag))
        {
            throw new CakeException($"Tag {tag} already exists.");
        }

        Information($"Creating tag: {tag}");
        RunGit($"tag -a {tag} -m \"{message}\"");

        Information($"Pushing tag: {tag}");
        RunGit($"push origin {tag}");
    });

Task("Default")
    .IsDependentOn("CreateTag");

RunTarget(target);
