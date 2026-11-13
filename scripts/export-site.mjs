// Exports site/ (Next.js, output: 'export') into dist/pages/site/ with the host token baked.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'site';
const OUT = join('dist', 'pages', 'site');
const TOKEN = 'site-fqdn.sentinel.invalid';

const run = (cmd, args, env = {}) => {
  const { status } = spawnSync(cmd, args, {
    cwd: SITE,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  if (status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited ${status}`);
};

// blog-md/<slug> -> blog/<slug>.md: the URL the next.config rewrite gave it.
const mirror = (from, to) => {
  const dir = join(OUT, from);
  if (!existsSync(dir)) return;
  mkdirSync(join(OUT, to), { recursive: true });
  for (const slug of readdirSync(dir)) renameSync(join(dir, slug), join(OUT, to, `${slug}.md`));
  rmSync(dir, { recursive: true });
};

if (!existsSync(join(SITE, 'node_modules'))) run('npm', ['ci', '--no-audit', '--no-fund']);
run('npx', ['next', 'build'], { NEXT_PUBLIC_SITE_FQDN: TOKEN, SITE_FQDN: TOKEN });
rmSync(OUT, { recursive: true, force: true });
cpSync(join(SITE, 'out'), OUT, { recursive: true });
mirror('blog-md', 'blog');
// The api part serves /.well-known/mcp-registry-auth from the mcpRegistryAuth setting.
rmSync(join(OUT, 'mcp-registry-auth'), { force: true });
console.log(`site exported to ${OUT}`);
