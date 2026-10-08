import { describe, expect, test } from 'vitest';
import { transform } from '../../actions/transform/index.ts';
import { pipe } from '../../methods/pipe/index.ts';
import { safeParse, safeParseAsync } from '../../methods/safeParse/index.ts';
import { looseObject } from '../looseObject/looseObject.ts';
import { strictObject } from '../strictObject/strictObject.ts';
import { string } from '../string/index.ts';
import { object } from './object.ts';
import { objectAsync } from './objectAsync.ts';

/**
 * Creates an entry schema with a counting transform to observe side effects.
 *
 * @param calls The call counter that is incremented by the transform.
 * @param calls.count The number of transform invocations.
 *
 * @returns The entry schema.
 */
function countedString(calls: { count: number }) {
  return pipe(
    string(),
    transform((value) => {
      calls.count++;
      return value.toUpperCase();
    })
  );
}

describe('unknownKeys config pipeline', () => {
  test('strip: removes unknown keys and runs known transforms', () => {
    const calls = { count: 0 };
    const result = safeParse(
      object({ name: countedString(calls) }),
      { name: 'foo', extra: 123 },
      { unknownKeys: 'strip' }
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output).toStrictEqual({ name: 'FOO' });
    }
    expect(calls.count).toBe(1);
  });

  test('keep: preserves unknown keys and runs known transforms', () => {
    const calls = { count: 0 };
    const result = safeParse(
      object({ name: countedString(calls) }),
      { name: 'foo', extra: 123 },
      { unknownKeys: 'keep' }
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output).toStrictEqual({ extra: 123, name: 'FOO' });
    }
    expect(calls.count).toBe(1);
  });

  test('reject: adds issue for unknown key without running any transform', () => {
    const calls = { count: 0 };
    const result = safeParse(
      object({ name: countedString(calls) }),
      { name: 'foo', extra: 123 },
      { unknownKeys: 'reject' }
    );
    expect(result.success).toBe(false);
    expect(calls.count).toBe(0);
    if (!result.success) {
      expect(result.issues).toHaveLength(1);
      const issue = result.issues[0];
      expect(issue.expected).toBe('never');
      expect(issue.input).toBe('extra');
      expect(issue.path?.[0]).toMatchObject({
        type: 'object',
        origin: 'key',
        key: 'extra',
      });
    }
  });

  test('reject: runs no transforms for multiple unknown keys', () => {
    const calls = { count: 0 };
    const result = safeParse(
      object({ name: countedString(calls) }),
      { name: 'foo', a: 1, b: 2 },
      { unknownKeys: 'reject' }
    );
    expect(result.success).toBe(false);
    expect(calls.count).toBe(0);
    if (!result.success) {
      // Only the first unknown key reports an issue
      expect(result.issues).toHaveLength(1);
    }
  });

  test('reject: nested object issue path points to the unknown key', () => {
    const calls = { count: 0 };
    const schema = object({
      child: object({ name: countedString(calls) }),
    });
    const result = safeParse(
      schema,
      { child: { name: 'foo', secret: 42 } },
      { unknownKeys: 'reject' }
    );
    expect(result.success).toBe(false);
    expect(calls.count).toBe(0);
    if (!result.success) {
      const path = result.issues[0].path;
      expect(path?.map((item) => item.key)).toStrictEqual(['child', 'secret']);
    }
  });

  test('reject: succeeds and runs transforms when no unknown key exists', () => {
    const calls = { count: 0 };
    const result = safeParse(
      object({ name: countedString(calls) }),
      { name: 'foo' },
      { unknownKeys: 'reject' }
    );
    expect(result.success).toBe(true);
    expect(calls.count).toBe(1);
    if (result.success) {
      expect(result.output).toStrictEqual({ name: 'FOO' });
    }
  });

  test('works with looseObject and strictObject schemas', () => {
    const calls = { count: 0 };
    const entries = { name: countedString(calls) };

    // looseObject + strip behaves like a plain object
    const stripped = safeParse(
      looseObject(entries),
      { name: 'foo', extra: 1 },
      { unknownKeys: 'strip' }
    );
    expect(stripped.success).toBe(true);
    if (stripped.success) {
      expect(stripped.output).toStrictEqual({ name: 'FOO' });
    }

    // strictObject + keep preserves unknown keys
    const kept = safeParse(
      strictObject(entries),
      { name: 'foo', extra: 1 },
      { unknownKeys: 'keep' }
    );
    expect(kept.success).toBe(true);
    if (kept.success) {
      expect(kept.output).toStrictEqual({ extra: 1, name: 'FOO' });
    }

    expect(calls.count).toBe(2);
  });

  test('works with async object schemas', async () => {
    const calls = { count: 0 };
    const result = await safeParseAsync(
      objectAsync({ name: countedString(calls) }),
      { name: 'foo', extra: 123 },
      { unknownKeys: 'reject' }
    );
    expect(result.success).toBe(false);
    expect(calls.count).toBe(0);
  });

  test('default behavior is unchanged without the option', () => {
    const calls = { count: 0 };
    const entries = { name: countedString(calls) };

    // object: strips unknown keys by default
    const plain = safeParse(object(entries), { name: 'foo', extra: 1 });
    expect(plain.success).toBe(true);
    if (plain.success) {
      expect(plain.output).toStrictEqual({ name: 'FOO' });
    }

    // looseObject: keeps unknown keys by default
    const loose = safeParse(looseObject(entries), { name: 'foo', extra: 1 });
    expect(loose.success).toBe(true);
    if (loose.success) {
      expect(loose.output).toStrictEqual({ extra: 1, name: 'FOO' });
    }

    // strictObject: rejects unknown keys by default (after transforms)
    const strictCalls = { count: 0 };
    const strict = safeParse(
      strictObject({ name: countedString(strictCalls) }),
      { name: 'foo', extra: 1 }
    );
    expect(strict.success).toBe(false);
    expect(strictCalls.count).toBe(1);
  });
});
