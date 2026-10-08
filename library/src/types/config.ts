import type { BaseIssue } from './issue.ts';
import type { ErrorMessage } from './other.ts';

/**
 * Unknown keys config type.
 *
 * Hint: The strategy is applied to object-like schemas (`object`,
 * `looseObject` and `strictObject`, including their async variants) before
 * the known entries are parsed:
 *
 * - `strip`: Remove unknown keys from the output.
 * - `keep`: Copy unknown keys to the output.
 * - `reject`: Add an issue for the first unknown key without running any
 *   known entry, so transformations with side effects are never executed.
 *
 * If this option is not set, every object schema keeps its default behavior.
 */
export type UnknownKeysConfig = 'strip' | 'keep' | 'reject';

/**
 * Config interface.
 */
export interface Config<TIssue extends BaseIssue<unknown>> {
  /**
   * The selected language.
   */
  readonly lang?: string | undefined;
  /**
   * The error message.
   */
  readonly message?: ErrorMessage<TIssue> | undefined;
  /**
   * Whether it should be aborted early.
   */
  readonly abortEarly?: boolean | undefined;
  /**
   * Whether a pipe should be aborted early.
   */
  readonly abortPipeEarly?: boolean | undefined;
  /**
   * How object-like schemas handle unknown keys before the known entries are
   * parsed. If not set, the default behavior of each schema is preserved.
   */
  readonly unknownKeys?: UnknownKeysConfig | undefined;
}
