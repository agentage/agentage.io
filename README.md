# agentage.io

The `root` extension (`@agentage/extension-root`): the agentage.io site as a static export, the
subscribers api and the two discovery documents (`/.well-known/agentage.json`,
`/.well-known/mcp-registry-auth`). Account routes live in
[agentage/extension-platform](https://github.com/agentage/extension-platform).

```bash
npm ci && npm run verify                   # type-check, lint, format, tests, site export, build
npx agentage extension check               # PASS root <version> conforms
```

## Run locally

1. `mkdir -p .agentage && cp secrets.example.json .agentage/secrets.json` (`resend` off sends no mail)
2. `npx agentage extension up`
3. Open http://localhost:4280

## The one page

[CLAUDE.md](CLAUDE.md): the parts, the site export, the loop on a laptop, release, the estate row.
