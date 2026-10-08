import { describe, expectTypeOf, test } from 'vitest';
import type { Config } from '../../types/index.ts';
import type { ObjectIssue } from './types.ts';

describe('unknownKeys config types', () => {
  test('should accept the three strategies', () => {
    expectTypeOf<'strip' | 'keep' | 'reject'>().toEqualTypeOf<
      NonNullable<Config<ObjectIssue>['unknownKeys']>
    >();
    expectTypeOf<Config<ObjectIssue>['unknownKeys']>().toEqualTypeOf<
      'strip' | 'keep' | 'reject' | undefined
    >();
  });
});
