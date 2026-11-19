import { type ApiContext } from '@agentage/extension';

const setting = (ctx: ApiContext, key: string) => String(ctx.settings[key] ?? '').trim();

// Issuer and telemetry from the platform, else their settings (the kit 0.18 host gives no platform).
const discovery = (ctx: ApiContext) => {
  const { issuer, telemetry } = ctx.platform;
  return {
    issuer: issuer || setting(ctx, 'issuer'),
    platform: setting(ctx, 'platform'),
    markets: [setting(ctx, 'market')],
    cloud: setting(ctx, 'cloud'),
    telemetry: telemetry || setting(ctx, 'telemetry'),
  };
};

export const wellKnownDocuments = (ctx: ApiContext) => {
  ctx.wellKnown('agentage.json', () => discovery(ctx));
  const proof = setting(ctx, 'mcpRegistryAuth');
  // Byte-identical to the landing route (trailing newline); unset stays a 404.
  if (proof) ctx.wellKnown('mcp-registry-auth', () => `${proof}\n`);
};
