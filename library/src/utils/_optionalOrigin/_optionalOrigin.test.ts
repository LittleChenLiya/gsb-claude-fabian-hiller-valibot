import { describe, expect, test } from 'vitest';
import { cache } from '../../methods/cache/cache.ts';
import { objectAsync } from '../../schemas/object/objectAsync.ts';
import { optionalAsync } from '../../schemas/optional/optionalAsync.ts';
import { safeParseAsync } from '../../methods/safeParse/safeParseAsync.ts';
import { transform } from '../../actions/transform/transform.ts';
import { number } from '../../schemas/number/number.ts';
import { object } from '../../schemas/object/object.ts';
import { optional } from '../../schemas/optional/optional.ts';
import { pipe } from '../../methods/pipe/pipe.ts';
import { safeParse } from '../../methods/safeParse/safeParse.ts';
import { string } from '../../schemas/string/string.ts';
import { getOrigin, getOrigins } from './_optionalOrigin.ts';

describe('optional origin metadata', () => {
  // Hint: The optional field has a default value and a transform so the
  // metadata has to follow the converted output.
  const Schema = object({
    name: pipe(optional(string(), 'anon'), transform((value) => value.length)),
    note: optional(string(), 'n/a'),
  });

  describe('four inputs with default and transform', () => {
    test('missing key -> missing', () => {
      const input = {};
      const result = safeParse(Schema, input);
      expect(result.success).toBe(true);
      expect(result.output).toEqual({ name: 4, note: 'n/a' });
      expect(getOrigins(result.output)).toEqual({
        name: 'missing',
        note: 'missing',
      });
      // Metadata is not written into the user object
      expect(Object.keys(result.output as object)).toEqual(['name', 'note']);
      expect(JSON.stringify(result.output)).toBe(
        '{"name":4,"note":"n/a"}'
      );
    });

    test('explicit undefined -> undefined', () => {
      const input = { name: undefined };
      const result = safeParse(Schema, input);
      expect(result.success).toBe(true);
      expect(result.output).toEqual({ name: 4, note: 'n/a' });
      expect(getOrigins(result.output)).toEqual({
        name: 'undefined',
        note: 'missing',
      });
    });

    test('regular value -> value', () => {
      const input = { name: 'abc' };
      const result = safeParse(Schema, input);
      expect(result.success).toBe(true);
      expect(result.output).toEqual({ name: 3, note: 'n/a' });
      expect(getOrigins(result.output)).toEqual({
        name: 'value',
        note: 'missing',
      });
    });

    test('null is a regular value, never missing', () => {
      const input = { name: null };
      const result = safeParse(Schema, input);
      // `null` is not a string, so there is a type issue, but the origin must
      // be tracked as `value` and the default must not be applied
      expect(result.success).toBe(false);
      expect(result.output).toEqual({ name: null, note: 'n/a' });
      expect(getOrigins(result.output)).toEqual({
        name: 'value',
        note: 'missing',
      });
    });
  });

  describe('original input is untouched', () => {
    test('inputs stay referentially and structurally unchanged', () => {
      const inputs: unknown[] = [
        {},
        { name: undefined },
        { name: 'abc' },
        { name: null },
      ];
      const snapshots = inputs.map((input) => ({
        keys: Object.keys(input as object),
        json: JSON.stringify(input),
      }));
      inputs.forEach((input) => safeParse(Schema, input));
      inputs.forEach((input, index) => {
        expect(Object.keys(input as object)).toEqual(snapshots[index].keys);
        expect(JSON.stringify(input)).toBe(snapshots[index].json);
      });
    });
  });

  describe('nested origin paths', () => {
    const Nested = object({
      user: object({
        name: optional(string(), 'anon'),
        meta: object({
          tag: optional(string(), 'x'),
        }),
      }),
      count: optional(number(), 0),
    });

    test('collects dot paths at the root and at every level', () => {
      const result = safeParse(Nested, {
        user: { meta: { tag: undefined } },
      });
      expect(result.success).toBe(true);
      expect(result.output).toEqual({
        user: { name: 'anon', meta: { tag: 'x' } },
        count: 0,
      });
      expect(getOrigins(result.output)).toEqual({
        'user.name': 'missing',
        'user.meta.tag': 'undefined',
        count: 'missing',
      });
      const output = result.output as {
        user: { name: string; meta: { tag: string } };
        count: number;
      };
      expect(getOrigins(output.user)).toEqual({
        name: 'missing',
        'meta.tag': 'undefined',
      });
      expect(getOrigins(output.user.meta)).toEqual({
        tag: 'undefined',
      });
    });
  });

  describe('old safeParse shape compatibility', () => {
    test('result still has typed, success, output and issues only', () => {
      const result = safeParse(Schema, {});
      expect(Object.keys(result).sort()).toEqual([
        'issues',
        'output',
        'success',
        'typed',
      ]);
      expect(result).toStrictEqual({
        typed: true,
        success: true,
        output: result.output,
        issues: undefined,
      });
    });

    test('short regression for the original parse interface', () => {
      const input = { name: 'hello' };
      const result = safeParse(Schema, input);
      expect(result).toMatchObject({
        typed: true,
        success: true,
        issues: undefined,
      });
      expect(result.output).toStrictEqual({ name: 5, note: 'n/a' });
      expect(getOrigins(result.output)?.name).toBe('value');
      expect(getOrigin(result.output)).toBeUndefined();
    });
  });

  describe('async data flow', () => {
    const AsyncSchema = objectAsync({
      name: optionalAsync(string(), 'anon'),
      note: optionalAsync(string(), 'n/a'),
    });

    test('tracks all four origins asynchronously', async () => {
      expect(
        getOrigins((await safeParseAsync(AsyncSchema, {})).output)
      ).toEqual({ name: 'missing', note: 'missing' });
      expect(
        getOrigins(
          (await safeParseAsync(AsyncSchema, { name: undefined })).output
        )
      ).toEqual({ name: 'undefined', note: 'missing' });
      expect(
        getOrigins((await safeParseAsync(AsyncSchema, { name: 'abc' })).output)
      ).toEqual({ name: 'value', note: 'missing' });
      expect(
        getOrigins((await safeParseAsync(AsyncSchema, { name: null })).output)
      ).toEqual({ name: 'value', note: 'missing' });
    });
  });

  describe('cache compatibility', () => {
    test('keeps origins when the optional entry itself is cached', () => {
      const CachedSchema = object({
        name: cache(optional(string(), 'anon')),
      });
      expect(getOrigins(safeParse(CachedSchema, {}).output)).toEqual({
        name: 'missing',
      });
      expect(
        getOrigins(safeParse(CachedSchema, { name: undefined }).output)
      ).toEqual({ name: 'undefined' });
      expect(
        getOrigins(safeParse(CachedSchema, { name: 'abc' }).output)
      ).toEqual({ name: 'value' });
    });
  });
});
