# agentage.io

The public site of agentage, the waitlist and the discovery documents. It is the `root` extension
(`@agentage/extension-root`): one npm package that agentage runs as a pages part, an api part and a
store part. Visitors use the site and join the waitlist. Clients and MCP registries read the
discovery documents.

```bash
npm ci && mkdir -p .agentage && cp secrets.example.json .agentage/secrets.json && npx agentage extension up
# needs Node 22, Docker, git; serves http://localhost:4280
```

## What it serves

| Route                                                          | Who calls it        | Scope              |
| -------------------------------------------------------------- | ------------------- | ------------------ |
| `/` and every site page                                        | visitors            | none               |
| `POST /api/v1/subscribers` (join the waitlist)                 | the site form       | none               |
| `POST /api/v1/subscribers/unsubscribe?email&token`             | the link in a mail  | none (signed link) |
| `GET /api/v1/subscribers` (list the waitlist, newest first)    | the team            | `root:admin`       |
| `/.well-known/agentage.json`, `/.well-known/mcp-registry-auth` | clients, registries | none               |

- The full list of api routes is [openapi.json](openapi.json). It is generated: do not edit it by hand.
- Account routes (machines, installations) live in
  [agentage/extension-platform](https://github.com/agentage/extension-platform).

## Words used here

- **Extension**: one npm package with a manifest in the `agentage` block of `package.json`.
- **Part**: one unit that agentage runs as its own container. `pages` and `api` are folders of `src/`; `store` is the `migrations/` folder (postgres).
- **Kit**: the library `@agentage/extension`. It owns the server, `/health`, auth and logs.
- **Gate**: the end-to-end suite in agentage/e2e (a private repo) that runs against a running copy.
- **next**: the staging environment at `next.agentage.io`.

## Run it locally

You need Node 22, npm 10, Docker and git. Ports 4280 and 4281 must be free: `up` refuses to start when another stack holds them.

1. `npm ci`
2. `mkdir -p .agentage && cp secrets.example.json .agentage/secrets.json`. The `resend` value `off` sends no mail.
3. `npx agentage extension up`.
4. Open http://localhost:4280 for the site.
5. Call the api with a token that has the route's scope:

   ```bash
   T=$(npx agentage extension token --scope root:admin)
   curl -H "Authorization: Bearer $T" localhost:4280/api/v1/subscribers   # 200
   ```

   A call without a token returns 401. A token with another scope returns 403.

6. `npx agentage extension down` removes this working copy's containers, network and volume.

## Prove a change

```bash
npm run verify                    # type-check, lint, format check, build (exports the site), tests with coverage
npx agentage extension check      # PASS root <version> conforms
```

The first build runs `npm ci` in `site/`. Coverage must stay at 70 percent or more on all four metrics.

## The site

`site/` is a Next.js app that is exported as static files into `dist/pages/site/` by `scripts/export-site.mjs`. It has its own `package.json` and lockfile. Next is not a dependency of the extension.

## Release

1. Raise the version in `package.json`.
2. Run `npx agentage extension check --write` and commit.
3. Push the tag `v<version>` on that commit on master.

`release.yml` then pushes the part images, attaches `agentage-extension.json` to the GitHub release and publishes to npm. A re-run only retries npm. A moved tag is refused: a fix is a new version.

For the rules an agent must follow when it changes this repo, read [CLAUDE.md](CLAUDE.md).
