# CLAUDE.md - agentage.io

For an agent that changes this repo. What it is, how to run it and how to release it: [README.md](README.md). The kit rules are in the READMEs of [`@agentage/extension`](https://www.npmjs.com/package/@agentage/extension). A deployed example of the same shape is [agentage/extension-probe](https://github.com/agentage/extension-probe).

## Where facts live

- Routes, scopes, status codes, body limits: `openapi.json` (generated; never edit by hand), summary in `README.md` "What it serves", limits in `docs/develop.md` "Routes".
- Run it locally, ports, tokens: `README.md` "Run it locally"; what `up` starts and logs: `docs/develop.md`.
- Database tables and migration rules: `migrations/`, rules in the Rules section below.
- Settings and secrets: the `agentage` block of `package.json`; seed values in `secrets.example.json`.
- How the site is exported: `README.md` "The site", `docs/develop.md` "The site", `scripts/export-site.mjs`.
- CI jobs and the gate floor (`MIN_EXECUTED`): `.github/workflows/ci.yml`. Test coverage floor: `vitest.config.ts`.
- Release rules and refusals: `README.md` "Release", `.github/workflows/release.yml`.

Read the file named here before you read `src/`.

## Where things are

| Part  | Folder               | What it does here                                                         |
| ----- | -------------------- | ------------------------------------------------------------------------- |
| pages | `src/pages`, `site/` | serves the exported site from `dist/pages/site/`                          |
| api   | `src/api`            | `/api/v1/subscribers` and the two `/.well-known/` documents, nothing else |
| store | `migrations/`        | postgres; the `subscribers` table                                         |

- This repo has no ui, mcp or worker part and no `*.mcpc.json`. The contract is `openapi.json`.
- Routes are in `src/api/subscribers.ts` and `src/api/well-known.ts`. The rate limit is in `src/api/rate-limit.ts`.
- Secrets are `resend` and `unsubscribe`. The kit refuses an empty secret, so `resend` set to `off` sends no mail. The unsubscribe link is an HMAC-SHA256 of the email with the `unsubscribe` secret. A rotated secret invalidates old links.
- Settings (`platform`, `market`, `cloud`, `mcpRegistryAuth`, `mailFrom`, `telemetry`) are declared in the `agentage` block of `package.json`.
- Account routes live in agentage/extension-platform, not here.

## Rules

- A part imports only its own folder and `src/lib/`. `src/manifest.test.ts` refuses a cross-part import.
- In `src/` never use `listen()`, the `process` global, a token check or an absolute agentage URL. The kit owns them.
- Declare a route with `ctx.route(method, path, { summary, scope, input, output }, handler)`. The scope is `read`, `write`, `admin` or `public`. The handler returns the data.
- Add a numbered file in `migrations/` for a schema change. Never edit a migration that ran. Write each one so a second run does nothing.
- Tests sit beside the code as `src/**/*.test.ts`. Coverage floor: 70 on all four metrics (`vitest.config.ts`). `npm run test:e2e` finds no `*.spec.ts` file here and passes with no tests.
- After a route change run `npm run build`, `npx agentage extension check --write`, then `npm run format`. `check` compares `openapi.json` with the code.
- Do not move a `v*` tag. Do not publish from a laptop.

## The site

- `site/` is copied from agentage/landing and patched for static export. It has its own `package.json` and lockfile. Dependabot covers `/` and `/site`.
- `npm run build` runs `scripts/export-site.mjs`: `next build` with the host token `site-fqdn.sentinel.invalid`, then `out/` to `dist/pages/site/`, and `blog-md/<slug>` to `blog/<slug>.md`. It drops the baked `mcp-registry-auth`, because the api part serves it. The kit swaps the token for the deployment host at start.
- A content change goes into agentage/landing and into `site/` on the same day. The parity run in agentage/e2e compares this site with the live agentage.io and shows a miss.

## Commands that prove a change

`npm run verify` runs in this order: type-check, lint, format check, build, tests with coverage. Run it first, then `npx agentage extension check`.

CI (`.github/workflows/ci.yml`) runs the same two steps. Its `local` job then runs `up`, `npm run test:e2e` and the gate: `npm run e2e -- root gate local` in agentage/e2e.

- The gate needs a `root:admin` token (`ROOT_TOKEN`), because the only token route is the admin list.
- The gate never retries. A gate that runs fewer checks than `MIN_EXECUTED` is red. The floor is set in `ci.yml` (the step "Assert the gate was not vacuous"). Raise it when the gate grows.
- The gate needs a `root` row in agentage/e2e `extensions.json`. The id must also be in the auth service's list of extension ids, so a token can carry `root:*` scopes.

## After a release

- A merge to the estate (agentage/estate) master deploys `next`. The deploy applies the stacks, checks each part's `/health`, then runs `npm run e2e -- root gate next`.
- The `version` field of the `root` row in `estate.yaml` sets which release runs. To change what runs, release a new version and change that field.
- Read a red deploy on the Actions tab of agentage/estate. It names the part and the check. Search the part's logs for the request's `agcid`.
- A kit minor reaches this repo through the Friday Dependabot group PR. Merge it when CI is green.
