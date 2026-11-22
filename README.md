# agentage.io

The public site of agentage. Visitors join the waitlist here. Clients and MCP registries read its discovery documents: `/.well-known/agentage.json` lists the service addresses, and `/.well-known/mcp-registry-auth` holds the proof an MCP registry asks for. Its extension id is `root`, and its package `@agentage/extension-root` is private: it is never on npm, the estate runs its images.

```bash
npm ci && mkdir -p .agentage && cp secrets.example.json .agentage/secrets.json && npx agentage extension up --docker
# needs Node 22, Docker, git; serves localhost:4280
```

## What it serves

| Route                                                          | Who calls it        | Scope              |
| -------------------------------------------------------------- | ------------------- | ------------------ |
| `/` and every site page                                        | visitors            | none               |
| `POST /api/root/subscribers`                                   | the site form       | none               |
| `POST /api/root/subscribers/unsubscribe?email&token`           | the link in a mail  | none (signed link) |
| `GET /api/root/subscribers` (the waitlist, newest first)       | the team            | `root:admin`       |
| `/.well-known/agentage.json`, `/.well-known/mcp-registry-auth` | clients, registries | none               |

- All api routes are in [openapi.json](openapi.json). It is generated: never edit it by hand.
- Account routes live in [agentage/extension-platform](https://github.com/agentage/extension-platform).

More: [Routes](docs/develop.md#routes).

## Words used here

- **Extension**: one npm package with a manifest in the `agentage` block of `package.json`.
- **Part**: one unit agentage runs as its own container: `src/pages`, `src/api` or `migrations/` (the postgres store). This extension has three parts: pages, api and store.
- **Kit**: the library `@agentage/extension`. It owns the server, `/health`, auth and logs.

## Run it locally

You need Node 22, npm 10, Docker and git. Ports 4280 and 4281 must be free, or `up` refuses to start.

1. `npm ci`
2. `mkdir -p .agentage && cp secrets.example.json .agentage/secrets.json`. The `resend` value `off` sends no mail.
3. `npx agentage extension up --docker`. It builds the images and waits until every part is healthy.
4. Open http://localhost:4280.
5. Call the api with a token that has the route's scope:

   ```bash
   T=$(npx agentage extension token --scope root:admin)
   curl -H "Authorization: Bearer $T" localhost:4280/api/root/subscribers   # 200
   ```

   A call without a token returns 401. A token with another scope returns 403.

6. `npx agentage extension down` removes the containers, network and volume.

More: [Run it locally](docs/develop.md#run-it-locally).

## Prove a change

```bash
npm run verify                    # type-check, lint, format, build, tests, coverage
npx agentage extension check      # PASS root <version> conforms
```

Coverage must stay at 70 percent or more on all four metrics.

## The site

`site/` is a Next.js app. `scripts/export-site.mjs` exports it as static files to `dist/pages/site/`.

More: [The site](docs/develop.md#the-site).

## Release

A merge to master is the release. `release.yml` runs `agentage extension release --changed`: when the repo differs from the last `root@*` tag, it makes a date version `YYYY.MDD.N`, the tag `root@<version>`, the part images and the one image, and attaches `agentage-extension.json` and `agentage-container.json` to the GitHub release. The package is private, so nothing goes to npm. A released version never changes: a fix is a new merge.

Every merge changes the repo, so every merge releases, a docs-only or CI-only merge too. The root row of `apphosts` has no `track`, so a release installs only when a PR there raises its `version`.

Preview what a merge would release, from a clone whose `origin/master` holds the commit: `GITHUB_REPOSITORY=agentage/agentage.io npx -y @agentage/cli@0.73.0 extension release --changed --dry-run`.

## Documentation

- [docs/develop.md](docs/develop.md): route limits, what `up` starts, logs, how the site is built, the words gate and next.
- [CLAUDE.md](CLAUDE.md): rules for an agent that changes this repo.

## License

MIT, see [LICENSE](LICENSE).
