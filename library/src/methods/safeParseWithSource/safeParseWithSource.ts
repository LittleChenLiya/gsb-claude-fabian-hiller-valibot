import { getGlobalConfig } from '../../storages/index.ts';
import type {
  BaseIssue,
  BaseSchema,
  Config,
  InferIssue,
} from '../../types/index.ts';
import { _getValueSources } from '../../utils/index.ts';
import type { SafeParseWithSourceResult } from './types.ts';

/**
 * Parses an unknown input based on a schema and additionally returns the
 * source metadata of `optional` schema values.
 *
 * Hint: The source metadata distinguishes whether the key of an `optional`
 * schema was missing (`'missing'`), explicitly set to `undefined`
 * (`'undefined'`) or provided as a normal value (`'value'`). `null` is
 * always treated as a normal value. The metadata travels with the value
 * through defaults and transformations, but is never written to the
 * user-facing output object.
 *
 * @param schema The schema to be used.
 * @param input The input to be parsed.
 * @param config The parse configuration.
 *
 * @returns The parse result with value source metadata.
 */
// @__NO_SIDE_EFFECTS__
export function safeParseWithSource<
  const TSchema extends BaseSchema<unknown, unknown, BaseIssue<unknown>>,
>(
  schema: TSchema,
  input: unknown,
  config?: Config<InferIssue<TSchema>>
): SafeParseWithSourceResult<TSchema> {
  const dataset = schema['~run']({ value: input }, getGlobalConfig(config));
  return {
    typed: dataset.typed,
    success: !dataset.issues,
    output: dataset.value,
    issues: dataset.issues,
    sources: _getValueSources(dataset),
  } as SafeParseWithSourceResult<TSchema>;
}
