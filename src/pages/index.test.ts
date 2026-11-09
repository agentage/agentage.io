import { createTestContext } from '@agentage/extension';
import { describe, expect, it } from 'vitest';
import { create } from './index.js';

describe('pages', () => {
  it('serves one page at /', () => {
    expect(Object.keys(create(createTestContext()))).toEqual(['/']);
  });
});
