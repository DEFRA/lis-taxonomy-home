# lis-taxonomy-home

Part of the Livestock Information Service (LIS), which lets livestock keepers, owners, agents and
delegates record and manage their animals.

`@defra/lis-taxonomy-home` is a shared npm package that holds the definition of the "home"
taxonomy: the home screen of a species microsite.

Used by:

- apps: [lis-apps-sheep-home](https://github.com/DEFRA/lis-apps-sheep-home)

## Installation

```bash
npm install @defra/lis-taxonomy-home
```

The package has no peer dependencies.

## Usage

LIS splits each microsite into a taxonomy and a species. A taxonomy package says which task the
microsite does, such as home, register, move or death. A species package says which animal it is
for. A microsite app combines one of each.

The only export is `taxonomy`, the home taxonomy definition:

```js
import { taxonomy } from '@defra/lis-taxonomy-home'

// {
//   id: 'home',
//   label: 'Home',
//   summary: 'Home screen for the selected species.',
//   accessMode: 'hub-service'
// }
```

[lis-apps-sheep-home](https://github.com/DEFRA/lis-apps-sheep-home) uses `taxonomy.id` together
with the species `id` from `@defra/lis-species-sheep` to build the microsite path:

```js
import { buildMicrositePath } from '@defra/lis-infra-ui-services'
import { taxonomy } from '@defra/lis-taxonomy-home'
import { species } from '@defra/lis-species-sheep'

const homePath = buildMicrositePath(taxonomy.id, species.id)
```

## Prerequisites

- Node.js 24 (see `.nvmrc`, use `nvm use`)
- To check changes against a consuming app: a local clone of [lis-dev](https://github.com/DEFRA/lis-dev) with its one-time setup done

## Setup

### Development

```bash
nvm use
npm install
```

### Test

There are no tools to install beyond `npm install`. Tests use [Vitest](https://vitest.dev/).

## Running in development

This is a library, so it has no server of its own. To try a change in a consuming app without
publishing, link the local copy into the lis-dev stack:

```bash
cd lis-dev
.bin/sideload link taxonomy/home # every installed copy now points at this repo
.bin/sideload up sheep-home       # optional: run a consumer locally with hot reload
.bin/sideload unlink taxonomy/home # when done
```

## Running tests

```bash
npm test                 # unit tests
npm run test:coverage    # with coverage
npm run lint             # ESLint
npm run format:check     # Prettier
```

Before releasing a change, also run the tests of each consuming repo against the linked package.

## Pipelines

Build, versioning and publishing run in GitHub Actions (`.github/workflows`) using Cake scripts (`*.cake`):

- **Pull request to `main`**: validate (format, lint, test), Sonar analysis, version check
- **Push to a `feature/` or `hotfix/` branch**: prerelease version and tag
- **Merge to `main`**: release tag, then publish to [npm](https://www.npmjs.com/package/@defra/lis-taxonomy-home)

Versions come from git tags (SemVer). After a merge, wait for the publish job to finish before bumping the package in consuming repos.

## Branching policy

The repo uses mainline development. Branch from `main` and name the branch:

- `feature/LREG-<ticket>-<short-kebab-description>`
- `hotfix/LREG-<ticket>-<short-kebab-description>`

`LREG` must be uppercase, because the GitHub ruleset rejects other branch names. Rebase onto `main`
rather than merging `main` in.

## Contributing to this project

- Follow the [Defra software development standards](https://github.com/DEFRA/software-development-standards).
- `npm install` sets up a pre-commit hook (Husky) that runs the security audit, format check and lint.
- Open a pull request against `main` using the PR template. CI must pass and the Sonar quality gate must be green before merge.
- Feature branches bump the minor version and hotfix branches the patch version. While the package is on 0.x, a breaking change to the public API ships as a minor version, so call it out in the PR so consumers can update.

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government licence v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of His Majesty's Stationery Office (HMSO) to enable information providers in the public sector to license the use and re-use of their information under a common open licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
