import { describe, expect, test, vi } from 'vitest';
import { check, minLength, transform } from '../../actions/index.ts';
import { array, object, string } from '../../schemas/index.ts';
import { pipe } from '../pipe/index.ts';
import { safeParse } from './safeParse.ts';

describe('safeParse', () => {
  test('should return successful output', () => {
    expect(
      safeParse(
        object({
          key: pipe(
            string(),
            minLength(5),
            transform((input) => input.length)
          ),
        }),
        { key: 'foobar' }
      )
    ).toStrictEqual({
      typed: true,
      success: true,
      output: { key: 6 },
      issues: undefined,
    });
  });

  test('should return typed output with issues', () => {
    expect(
      safeParse(object({ key: pipe(string(), minLength(5)) }), { key: 'foo' })
    ).toStrictEqual({
      typed: true,
      success: false,
      output: { key: 'foo' },
      issues: [
        {
          kind: 'validation',
          type: 'min_length',
          input: 'foo',
          expected: '>=5',
          received: '3',
          message: 'Invalid length: Expected >=5 but received 3',
          requirement: 5,
          path: [
            {
              type: 'object',
              origin: 'value',
              input: { key: 'foo' },
              key: 'key',
              value: 'foo',
            },
          ],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ],
    });
  });

  test('should return untyped output with issues', () => {
    expect(safeParse(object({ key: string() }), { key: 123 })).toStrictEqual({
      typed: false,
      success: false,
      output: { key: 123 },
      issues: [
        {
          kind: 'schema',
          type: 'string',
          input: 123,
          expected: 'string',
          received: '123',
          message: 'Invalid type: Expected string but received 123',
          requirement: undefined,
          path: [
            {
              type: 'object',
              origin: 'value',
              input: { key: 123 },
              key: 'key',
              value: 123,
            },
          ],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ],
    });
  });
});

describe('should mark incomplete issues on early abort', () => {
  const input = ['foo', 'bar', 'baz'];

  test('with abort early', () => {
    const requirement = vi.fn(() => false);
    const schema = array(pipe(string(), check(requirement)));
    const result = safeParse(schema, input, { abortEarly: true });
    expect(result.typed).toBe(false);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.length).toBe(1);
      expect(result.incomplete).toBe(true);
      expect(result.issues[0].path).toStrictEqual([
        {
          type: 'array',
          origin: 'value',
          input,
          key: 0,
          value: 'foo',
        },
      ]);
    }
    expect(requirement).toHaveBeenCalledTimes(1);
  });

  test('without abort early', () => {
    const requirement = vi.fn(() => false);
    const schema = array(pipe(string(), check(requirement)));
    const result = safeParse(schema, input);
    expect(result.typed).toBe(true);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.length).toBe(3);
      expect(result.incomplete).toBeUndefined();
      expect(result.issues[1].path).toStrictEqual([
        {
          type: 'array',
          origin: 'value',
          input,
          key: 1,
          value: 'bar',
        },
      ]);
    }
    expect(requirement).toHaveBeenCalledTimes(3);
  });
});
