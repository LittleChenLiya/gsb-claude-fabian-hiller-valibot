import type {
  BaseIssue,
  BaseSchema,
  BaseSchemaAsync,
} from '../../types/index.ts';
import type { ValueSourceEntry } from '../../utils/index.ts';
import type { SafeParseResult } from '../safeParse/index.ts';

/**
 * Safe parse with source result type.
 *
 * Hint: The result is a superset of the `SafeParseResult` type. The
 * additional `sources` property describes where the values of `optional`
 * schemas came from. It is transported alongside the output, but is never
 * written to the user-facing output object.
 */
export type SafeParseWithSourceResult<
  TSchema extends
    | BaseSchema<unknown, unknown, BaseIssue<unknown>>
    | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>,
> = SafeParseResult<TSchema> & {
  /**
   * The value source entries of `optional` schemas.
   */
  readonly sources: ValueSourceEntry[];
};
