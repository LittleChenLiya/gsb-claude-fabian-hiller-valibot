import { describe, expect, test } from 'vitest';
import { transform } from '../../actions/index.ts';
import { number, object, optional, string } from '../../schemas/index.ts';
import { pipe } from '../pipe/index.ts';
import { safeParse } from '../safeParse/index.ts';
import { safeParseWithSource } from './safeParseWithSource.ts';

describe('safeParseWithSource', () => {
  // Schema with default and transformation
  const schema = object({
    name: optional(
      pipe(
        string(),
        transform((input) => input.trim().toUpperCase())
      ),
      '  anon  '
    ),
  });

  test('should report "missing" for key that is not provided', () => {
    const input = {};
    expect(safeParseWithSource(schema, input)).toStrictEqual({
      typed: true,
      success: true,
      output: { name: 'ANON' },
      issues: undefined,
      sources: [{ path: ['name'], source: 'missing' }],
    });
    // Original input is not mutated
    expect(input).toStrictEqual({});
  });

  test('should report "undefined" for explicit undefined value', () => {
    const input = { name: undefined };
    expect(safeParseWithSource(schema, input)).toStrictEqual({
      typed: true,
      success: true,
      output: { name: 'ANON' },
      issues: undefined,
      sources: [{ path: ['name'], source: 'undefined' }],
    });
    // Original input is not mutated
    expect(input).toStrictEqual({ name: undefined });
  });

  test('should report "value" for provided normal value', () => {
    const input = { name: '  bob  ' };
    expect(safeParseWithSource(schema, input)).toStrictEqual({
      typed: true,
      success: true,
      output: { name: 'BOB' },
      issues: undefined,
      sources: [{ path: ['name'], source: 'value' }],
    });
    // Original input is not mutated
    expect(input).toStrictEqual({ name: '  bob  ' });
  });

  test('should not report "missing" for null value', () => {
    const input = { name: null };
    const result = safeParseWithSource(schema, input);
    // `null` is treated as a normal value and fails the wrapped schema
    expect(result.typed).toBe(false);
    expect(result.success).toBe(false);
    expect(result.output).toStrictEqual({ name: null });
    expect(result.issues?.length).toBe(1);
    expect(result.sources).toStrictEqual([{ path: ['name'], source: 'value' }]);
    // Original input is not mutated
    expect(input).toStrictEqual({ name: null });
  });

  test('should not write source metadata into user object', () => {
    const result = safeParseWithSource(schema, {});
    const output = result.output as Record<string, unknown>;
    expect(Object.keys(output)).toStrictEqual(['name']);
    expect(Object.getOwnPropertySymbols(output)).toStrictEqual([]);
  });

  test('should report source paths of nested fields', () => {
    const nested = object({
      user: object({
        name: optional(string(), 'anon'),
        age: optional(number()),
      }),
    });

    // Missing nested keys (with and without default)
    expect(safeParseWithSource(nested, { user: {} }).sources).toStrictEqual([
      { path: ['user', 'name'], source: 'missing' },
      { path: ['user', 'age'], source: 'missing' },
    ]);

    // Explicit undefined and normal value in nested object
    expect(
      safeParseWithSource(nested, { user: { name: undefined, age: 42 } })
        .sources
    ).toStrictEqual([
      { path: ['user', 'name'], source: 'undefined' },
      { path: ['user', 'age'], source: 'value' },
    ]);
  });

  test('should report source of root level optional schema', () => {
    expect(
      safeParseWithSource(optional(string(), 'fallback'), undefined).sources
    ).toStrictEqual([{ path: [], source: 'undefined' }]);
    expect(
      safeParseWithSource(optional(string(), 'fallback'), 'value').sources
    ).toStrictEqual([{ path: [], source: 'value' }]);
  });

  describe('should be compatible with safeParse', () => {
    const inputs = [
      {},
      { name: undefined },
      { name: '  bob  ' },
      { name: null },
    ];

    test('should return same output as safeParse', () => {
      for (const input of inputs) {
        const withSource = safeParseWithSource(schema, input);
        const original = safeParse(schema, input);
        expect({
          typed: withSource.typed,
          success: withSource.success,
          output: withSource.output,
          issues: withSource.issues,
        }).toStrictEqual(original);
      }
    });

    test('should not change shape of safeParse result', () => {
      for (const input of inputs) {
        const result = safeParse(schema, input);
        expect(Object.keys(result)).toStrictEqual([
          'typed',
          'success',
          'output',
          'issues',
        ]);
        expect('sources' in result).toBe(false);
      }
    });
  });
});
