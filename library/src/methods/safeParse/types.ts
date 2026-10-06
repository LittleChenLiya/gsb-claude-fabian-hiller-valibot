import type {
  BaseIssue,
  BaseSchema,
  BaseSchemaAsync,
  InferIssue,
  InferOutput,
} from '../../types/index.ts';

/**
 * Safe parse result type.
 */
export type SafeParseResult<
  TSchema extends
    | BaseSchema<unknown, unknown, BaseIssue<unknown>>
    | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>,
> =
  | {
      /**
       * Whether it's typed.
       */
      readonly typed: true;
      /**
       * Whether it's successful.
       */
      readonly success: true;
      /**
       * The output value.
       */
      readonly output: InferOutput<TSchema>;
      /**
       * The issues, if any.
       */
      readonly issues: undefined;
      /**
       * Whether the validation was exhaustive and not aborted early before
       * all nested values were checked.
       */
      readonly complete: true;
    }
  | {
      readonly typed: true;
      readonly success: false;
      readonly output: InferOutput<TSchema>;
      readonly issues: [InferIssue<TSchema>, ...InferIssue<TSchema>[]];
      /**
       * Whether the validation was exhaustive and not aborted early before
       * all nested values were checked.
       */
      readonly complete: boolean;
    }
  | {
      readonly typed: false;
      readonly success: false;
      readonly output: unknown;
      readonly issues: [InferIssue<TSchema>, ...InferIssue<TSchema>[]];
      /**
       * Whether the validation was exhaustive and not aborted early before
       * all nested values were checked.
       */
      readonly complete: boolean;
    };
