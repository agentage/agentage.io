# Develop

Depth for [README.md](../README.md): routes, the local stack and the site.

## Routes

- Joins and bad unsubscribe links share one limit: 10 per 15 minutes per IP. A valid signed link does not count.
- `/.well-known/mcp-registry-auth` answers 404 until the `mcpRegistryAuth` setting has a value.

## Run it locally

Step 3 of "Run it locally" is `npx agentage extension up`. It builds the images. It starts postgres, a dev token issuer on port 4281 and a gateway on port 4280. It waits until every part is healthy.

`up` writes `.agentage/`. Git ignores it. Each part logs JSON lines, with an `agcid` for each request. To read them, find the container with `docker ps`, then run `docker logs <container>`.

## The site

`site/` is a Next.js app. `scripts/export-site.mjs` exports it as static files to `dist/pages/site/`. The code in `site/` is copied from [agentage/landing](https://github.com/agentage/landing) and patched for `output: 'export'`. It has its own `package.json` and lockfile. Next is not a dependency of the extension. Lint and format skip `site/`. `next build` type-checks it. The first `npm run verify` build runs `npm ci` in `site/`.

## Words

- **Gate**: the end-to-end suite in agentage/e2e (private) that runs against a running copy.
- **next**: the staging environment at `next.agentage.io`.
