import { describe, expect, test } from 'vitest';
import { check, minLength, transform } from '../../actions/index.ts';
import { array, number, object, string } from '../../schemas/index.ts';
import { ValiError } from '../../utils/index.ts';
import { parse } from '../parse/index.ts';
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
      complete: true,
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
      complete: true,
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
      complete: true,
    });
  });
});

describe('completeness receipt for early abort', () => {
  const schema = array(number());
  const input = ['foo', 'bar', 'baz'];

  test('should return single incomplete issue for issue limit of 1', () => {
    const result = safeParse(schema, input, { abortEarly: true });
    expect(result.typed).toBe(false);
    expect(result.success).toBe(false);
    expect(result.complete).toBe(false);
    expect(result.issues?.length).toBe(1);
    expect(result.issues?.[0].path?.[0]).toMatchObject({
      type: 'array',
      key: 0,
    });
  });

  test('should return all issues with array index paths by default', () => {
    const result = safeParse(schema, input);
    expect(result.typed).toBe(false);
    expect(result.success).toBe(false);
    expect(result.complete).toBe(true);
    expect(result.issues?.length).toBe(3);
    expect(result.issues?.[1].path?.[0]).toMatchObject({
      type: 'array',
      key: 1,
    });
  });

  test('should throw all issues with normal parse', () => {
    try {
      parse(schema, input);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ValiError);
      expect((error as ValiError<typeof schema>).issues.length).toBe(3);
      expect(
        (error as ValiError<typeof schema>).issues[1].path?.[0]
      ).toMatchObject({ type: 'array', key: 1 });
    }
  });

  test('should not mark result as incomplete if last item aborts', () => {
    const result = safeParse(schema, [1, 2, 'foo'], { abortEarly: true });
    expect(result.success).toBe(false);
    expect(result.complete).toBe(true);
    expect(result.issues?.length).toBe(1);
  });

  test('should run custom action only once per checked item', () => {
    let count = 0;
    const actionSchema = array(
      pipe(
        number(),
        check((input) => {
          count++;
          return input > 0;
        })
      )
    );
    const result = safeParse(actionSchema, [1, 2, 3], { abortEarly: true });
    expect(result.success).toBe(true);
    expect(result.complete).toBe(true);
    expect(count).toBe(3);
  });

  test('should not rerun custom action of unchecked items', () => {
    let count = 0;
    const actionSchema = array(
      pipe(
        number(),
        check((input) => {
          count++;
          return input > 0;
        })
      )
    );
    const result = safeParse(actionSchema, [1, 'foo', 3], {
      abortEarly: true,
    });
    expect(result.success).toBe(false);
    expect(result.complete).toBe(false);
    expect(count).toBe(1);
  });
});
