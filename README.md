# agentage.io

The public site of agentage, with its waitlist and discovery documents. Visitors join the waitlist. Clients and MCP registries read the discovery documents. Its extension id is `root`, and its npm package is `@agentage/extension-root`. agentage runs it as three parts: pages, api and store.

```bash
npm ci && mkdir -p .agentage && cp secrets.example.json .agentage/secrets.json && npx agentage extension up
# needs Node 22, Docker, git; serves localhost:4280
```

## What it serves

| Route                                                          | Who calls it        | Scope              |
| -------------------------------------------------------------- | ------------------- | ------------------ |
| `/` and every site page                                        | visitors            | none               |
| `POST /api/v1/subscribers`                                     | the site form       | none               |
| `POST /api/v1/subscribers/unsubscribe?email&token`             | the link in a mail  | none (signed link) |
| `GET /api/v1/subscribers` (the waitlist, newest first)         | the team            | `root:admin`       |
| `/.well-known/agentage.json`, `/.well-known/mcp-registry-auth` | clients, registries | none               |

- All api routes are in [openapi.json](openapi.json). It is generated: never edit it by hand.
- Account routes live in [agentage/extension-platform](https://github.com/agentage/extension-platform).

More: [Routes](docs/develop.md#routes).

## Words used here

- **Extension**: one npm package with a manifest in the `agentage` block of `package.json`.
- **Part**: one unit agentage runs as its own container: `src/pages`, `src/api` or `migrations/` (the postgres store).
- **Kit**: the library `@agentage/extension`. It owns the server, `/health`, auth and logs.

## Run it locally

You need Node 22, npm 10, Docker and git. Ports 4280 and 4281 must be free, or `up` refuses to start.

1. `npm ci`
2. `mkdir -p .agentage && cp secrets.example.json .agentage/secrets.json`. The `resend` value `off` sends no mail.
3. `npx agentage extension up`. It builds the images and waits until every part is healthy.
4. Open http://localhost:4280.
5. Call the api with a token that has the route's scope:

   ```bash
   T=$(npx agentage extension token --scope root:admin)
   curl -H "Authorization: Bearer $T" localhost:4280/api/v1/subscribers   # 200
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

`site/` is a Next.js app. `scripts/export-site.mjs` exports it as static files to `dist/pages/site/`. Next is not a dependency of the extension.

More: [The site](docs/develop.md#the-site).

## Release

1. Raise the version in `package.json`.
2. Run `npx agentage extension check --write` and commit.
3. Push the tag `v<version>` on that commit on master.

`release.yml` pushes the part images. It attaches `agentage-extension.json` to the GitHub release. It publishes the package to npm. A re-run only retries npm. A moved tag is refused: a fix is a new version.

## Documentation

- [docs/develop.md](docs/develop.md): route limits, what `up` starts, logs, how the site is built, the words gate and next.
- [CLAUDE.md](CLAUDE.md): rules for an agent that changes this repo.

## License

MIT, see [LICENSE](LICENSE).
