import type {
  BaseIssue,
  BaseSchema,
  BaseSchemaAsync,
  Config,
  UnknownKeysConfig,
} from '../../types/index.ts';
import { _addIssue } from '../_addIssue/index.ts';
import { _isValidObjectKey } from '../_isValidObjectKey/index.ts';

/**
 * Object entries interface for unknown key handling.
 */
interface UnknownKeyEntries {
  [key: string]: unknown;
}

/**
 * Output dataset interface for unknown key handling.
 */
interface UnknownKeyDataset {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

/**
 * Handles the unknown keys of an object input according to the configured
 * `unknownKeys` strategy before the known entries are parsed.
 *
 * Hint: With `reject`, the function returns `true` after adding an issue for
 * the first unknown key. The caller must skip the parsing of the known
 * entries, so transformations with side effects are never executed.
 *
 * @param context The schema context.
 * @param dataset The output dataset.
 * @param dataset.value The output object that unknown keys are copied to.
 * @param config The config.
 * @param input The object input.
 * @param entries The known object entries.
 * @param unknownKeys The unknown keys strategy.
 *
 * @returns Whether the parsing of the known entries must be skipped.
 *
 * @internal
 */
export function _handleUnknownKeys(
  context:
    | BaseSchema<unknown, unknown, BaseIssue<unknown>>
    | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>,
  dataset: UnknownKeyDataset,
  config: Config<BaseIssue<unknown>>,
  input: object,
  entries: UnknownKeyEntries,
  unknownKeys: UnknownKeysConfig
): boolean {
  // Hint: We exclude specific keys for security reasons
  for (const key in input) {
    if (
      _isValidObjectKey(input, key) &&
      !Object.prototype.hasOwnProperty.call(entries, key)
    ) {
      // Reject: Add issue for first unknown key and signal to skip entries
      if (unknownKeys === 'reject') {
        _addIssue(context, 'key', dataset, config, {
          input: key,
          expected: 'never',
          path: [
            {
              type: 'object',
              origin: 'key',
              input: input as Record<string, unknown>,
              key,
              value: (input as Record<string, unknown>)[key],
            },
          ],
        });
        return true;
      }

      // Keep: Copy unknown key to output dataset
      if (unknownKeys === 'keep') {
        dataset.value[key] = (input as Record<string, unknown>)[key];
      }
    }
  }

  // Strip (or keep without unknown keys): Continue with known entries
  return false;
}
