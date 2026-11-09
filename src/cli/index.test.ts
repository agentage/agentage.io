import { createTestContext } from '@agentage/extension';
import { describe, expect, it } from 'vitest';
import { create } from './index.js';

describe('agentage ping', () => {
  it.each([
    [{}, 'pong'],
    [{ msg: 'hi' }, 'pong hi'],
  ])('with args %j prints %s', (args, line) => {
    const ctx = createTestContext({ args });
    create(ctx).ping();
    expect(ctx.output).toEqual({ stdout: [line], stderr: [] });
    expect(ctx.exitCode).toBeUndefined();
  });
});
