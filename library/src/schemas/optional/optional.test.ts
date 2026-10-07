import { describe, expect, test } from 'vitest';
import { transform } from '../../actions/transform/index.ts';
import { pipe } from '../../methods/pipe/index.ts';
import { safeParse } from '../../methods/safeParse/index.ts';
import { getOrigins } from '../../utils/index.ts';
import { expectNoSchemaIssue, expectSchemaIssue } from '../../vitest/index.ts';
import { object } from '../object/index.ts';
import {
  string,
  type StringIssue,
  type StringSchema,
} from '../string/index.ts';
import { optional, type OptionalSchema } from './optional.ts';

describe('optional', () => {
  describe('should return schema object', () => {
    const baseSchema: Omit<
      OptionalSchema<StringSchema<undefined>, string>,
      'default'
    > = {
      kind: 'schema',
      type: 'optional',
      reference: optional,
      expects: '(string | undefined)',
      wrapped: {
        ...string(),
        '~standard': {
          version: 1,
          vendor: 'valibot',
          validate: expect.any(Function),
        },
        '~run': expect.any(Function),
      },
      async: false,
      '~standard': {
        version: 1,
        vendor: 'valibot',
        validate: expect.any(Function),
      },
      '~run': expect.any(Function),
    };

    test('with undefined default', () => {
      const expected: OptionalSchema<StringSchema<undefined>, undefined> = {
        ...baseSchema,
        default: undefined,
      };
      expect(optional(string())).toStrictEqual(expected);
      expect(optional(string(), undefined)).toStrictEqual(expected);
    });

    test('with undefined getter default', () => {
      const getter = () => undefined;
      expect(optional(string(), getter)).toStrictEqual({
        ...baseSchema,
        default: getter,
      } satisfies OptionalSchema<StringSchema<undefined>, typeof getter>);
    });

    test('with value default', () => {
      expect(optional(string(), 'foo')).toStrictEqual({
        ...baseSchema,
        default: 'foo',
      } satisfies OptionalSchema<StringSchema<undefined>, 'foo'>);
    });

    test('with value getter default', () => {
      const getter = () => 'foo';
      expect(optional(string(), getter)).toStrictEqual({
        ...baseSchema,
        default: getter,
      } satisfies OptionalSchema<StringSchema<undefined>, typeof getter>);
    });
  });

  describe('should return dataset without issues', () => {
    const schema = optional(string());

    test('for wrapper type', () => {
      expectNoSchemaIssue(schema, ['', 'foo', '#$%']);
    });

    test('for undefined', () => {
      expectNoSchemaIssue(schema, [undefined]);
    });
  });

  describe('should return dataset with issues', () => {
    const schema = optional(string('message'));
    const baseIssue: Omit<StringIssue, 'input' | 'received'> = {
      kind: 'schema',
      type: 'string',
      expected: 'string',
      message: 'message',
    };

    test('for invalid wrapper type', () => {
      expectSchemaIssue(schema, baseIssue, [123, true, {}]);
    });

    test('for null', () => {
      expectSchemaIssue(schema, baseIssue, [null]);
    });
  });

  describe('should return dataset without default', () => {
    test('for undefined default', () => {
      expectNoSchemaIssue(optional(string()), [undefined, 'foo']);
      expectNoSchemaIssue(optional(string(), undefined), [undefined, 'foo']);
    });

    test('for wrapper type', () => {
      expectNoSchemaIssue(optional(string(), 'foo'), ['', 'bar', '#$%']);
    });
  });

  describe('should return dataset with default', () => {
    const schema1 = optional(string(), 'foo');
    const schema2 = optional(string(), () => undefined);
    const schema3 = optional(string(), () => 'foo');

    test('for undefined', () => {
      expect(schema1['~run']({ value: undefined }, {})).toStrictEqual({
        typed: true,
        value: 'foo',
      });
      expect(schema2['~run']({ value: undefined }, {})).toStrictEqual({
        typed: true,
        value: undefined,
      });
      expect(schema3['~run']({ value: undefined }, {})).toStrictEqual({
        typed: true,
        value: 'foo',
      });
    });
  });

  describe('should track the default origin through the existing data flow', () => {
    // Short regression example for the original `safeParse` interface: the
    // origin metadata follows the default value and its transform, but it is
    // not written into the user object.
    const schema = object({
      name: pipe(
        optional(string(), 'anon'),
        transform((value) => value.length)
      ),
    });

    test('for missing key', () => {
      const result = safeParse(schema, {});
      expect(result).toMatchObject({
        typed: true,
        success: true,
        issues: undefined,
      });
      expect(result.output).toStrictEqual({ name: 4 });
      expect(getOrigins(result.output)).toStrictEqual({ name: 'missing' });
    });

    test('for explicit undefined', () => {
      const result = safeParse(schema, { name: undefined });
      expect(result.output).toStrictEqual({ name: 4 });
      expect(getOrigins(result.output)).toStrictEqual({
        name: 'undefined',
      });
    });

    test('for regular value and for null', () => {
      expect(getOrigins(safeParse(schema, { name: 'abc' }).output)).toStrictEqual({
        name: 'value',
      });
      const nullResult = safeParse(schema, { name: null });
      expect(nullResult.success).toBe(false);
      expect(getOrigins(nullResult.output)).toStrictEqual({ name: 'value' });
    });
  });
});
