# Develop

## Routes

- One limit covers two routes: 10 per 15 min per IP, on joins and on bad unsubscribe links. A valid signed link does not count.
- `/.well-known/mcp-registry-auth` answers 404 until the `mcpRegistryAuth` setting has a value.

## Run it locally

`npx agentage extension up`. It builds the images, starts postgres, a dev token issuer (port 4281) and a gateway (port 4280), and waits until every part is healthy.

`up` writes `.agentage/` (git ignores it). A part logs JSON lines with an `agcid` for each request: find the container with `docker ps`, then `docker logs <container>`.

## The site

`site/` is a Next.js app. It is copied from [agentage/landing](https://github.com/agentage/landing) and patched for `output: 'export'`. Lint and format skip `site/`; `next build` type-checks it.
