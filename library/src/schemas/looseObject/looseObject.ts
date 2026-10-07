import { getDefault } from '../../methods/getDefault/index.ts';
import { getFallback } from '../../methods/getFallback/index.ts';
import type {
  BaseSchema,
  ErrorMessage,
  InferObjectInput,
  InferObjectIssue,
  InferObjectOutput,
  ObjectEntries,
  ObjectPathItem,
  OutputDataset,
  UnknownKeysOptions,
  UnknownKeysPolicy,
} from '../../types/index.ts';
import {
  _addIssue,
  _isValidObjectKey,
  _standardSchema,
} from '../../utils/index.ts';
import type { LooseObjectIssue } from './types.ts';

/**
 * Loose object schema interface.
 */
export interface LooseObjectSchema<
  TEntries extends ObjectEntries,
  TMessage extends ErrorMessage<LooseObjectIssue> | undefined,
> extends BaseSchema<
    InferObjectInput<TEntries> & { [key: string]: unknown },
    InferObjectOutput<TEntries> & { [key: string]: unknown },
    LooseObjectIssue | InferObjectIssue<TEntries>
  > {
  /**
   * The schema type.
   */
  readonly type: 'loose_object';
  /**
   * The schema reference.
   */
  readonly reference: typeof looseObject;
  /**
   * The expected property.
   */
  readonly expects: 'Object';
  /**
   * The entries schema.
   */
  readonly entries: TEntries;
  /**
   * The error message.
   */
  readonly message: TMessage;
  /**
   * The unknown keys policy.
   */
  readonly unknownKeys?: UnknownKeysPolicy | undefined;
}

/* eslint-disable @typescript-eslint/unified-signatures --
 * The overloads are intentionally kept separate so that the
 * error message and the unknown keys options can be provided
 * independently of each other.
 */
/**
 * Creates a loose object schema.
 *
 * @param entries The entries schema.
 *
 * @returns A loose object schema.
 */
export function looseObject<const TEntries extends ObjectEntries>(
  entries: TEntries
): LooseObjectSchema<TEntries, undefined>;

/**
 * Creates a loose object schema.
 *
 * @param entries The entries schema.
 * @param message The error message.
 *
 * @returns A loose object schema.
 */
export function looseObject<
  const TEntries extends ObjectEntries,
  const TMessage extends ErrorMessage<LooseObjectIssue> | undefined,
>(entries: TEntries, message: TMessage): LooseObjectSchema<TEntries, TMessage>;

/**
 * Creates a loose object schema.
 *
 * Hint: This schema keeps unknown entries by default. With the
 * `unknownKeys` option you can explicitly decide the pipeline order: the
 * policy (`'keep'`, `'strip'` or `'reject'`) is applied to unknown keys
 * before the known entries (and their transformations) are executed. With
 * `'reject'`, transformations with side effects are never executed if an
 * unknown key is present.
 *
 * @param entries The entries schema.
 * @param options The unknown keys options.
 *
 * @returns A loose object schema.
 */
export function looseObject<const TEntries extends ObjectEntries>(
  entries: TEntries,
  options: UnknownKeysOptions
): LooseObjectSchema<TEntries, undefined>;

/**
 * Creates a loose object schema.
 *
 * Hint: This schema keeps unknown entries by default. With the
 * `unknownKeys` option you can explicitly decide the pipeline order: the
 * policy (`'keep'`, `'strip'` or `'reject'`) is applied to unknown keys
 * before the known entries (and their transformations) are executed. With
 * `'reject'`, transformations with side effects are never executed if an
 * unknown key is present.
 *
 * @param entries The entries schema.
 * @param message The error message.
 * @param options The unknown keys options.
 *
 * @returns A loose object schema.
 */
export function looseObject<
  const TEntries extends ObjectEntries,
  const TMessage extends ErrorMessage<LooseObjectIssue> | undefined,
>(
  entries: TEntries,
  message: TMessage,
  options: UnknownKeysOptions
): LooseObjectSchema<TEntries, TMessage>;

/* eslint-enable @typescript-eslint/unified-signatures */

// @__NO_SIDE_EFFECTS__
export function looseObject(
  entries: ObjectEntries,
  arg2?: ErrorMessage<LooseObjectIssue> | UnknownKeysOptions,
  arg3?: UnknownKeysOptions
): LooseObjectSchema<
  ObjectEntries,
  ErrorMessage<LooseObjectIssue> | undefined
> {
  // Distinguish between message and options argument
  const [message, options] =
    typeof arg2 === 'object' && arg2 !== null
      ? [undefined, arg2]
      : [arg2, arg3];

  return _standardSchema({
    kind: 'schema',
    type: 'loose_object',
    reference: looseObject,
    expects: 'Object',
    async: false,
    entries,
    message,
    // Hint: The `unknownKeys` property is only added if the option is
    // explicitly specified to keep the default schema object unchanged.
    ...(options?.unknownKeys
      ? { unknownKeys: options.unknownKeys }
      : undefined),
    '~run'(dataset, config) {
      // Get input value from dataset
      const input = dataset.value;

      // If root type is valid, check nested types
      if (input && typeof input === 'object') {
        // Set typed to `true` and value to blank object
        // @ts-expect-error
        dataset.typed = true;
        dataset.value = {};

        // Get unknown keys policy (defaults to `'keep'`)
        const unknownKeys = this.unknownKeys ?? 'keep';

        // Pipeline step 1: If policy is `'reject'`, decide on unknown keys
        // before any known entry is parsed. Hint: We return early so that
        // transformations with side effects are never executed when an
        // unknown key is present.
        if (unknownKeys === 'reject') {
          for (const key in input) {
            if (!Object.prototype.hasOwnProperty.call(this.entries, key)) {
              _addIssue(this, 'key', dataset, config, {
                input: key,
                expected: 'never',
                path: [
                  {
                    type: 'object',
                    origin: 'key',
                    input: input as Record<string, unknown>,
                    key,
                    // @ts-expect-error
                    value: input[key],
                  },
                ],
              });

              // Hint: We intentionally break the loop after the first unknown
              // entry. Otherwise, attackers could send large objects to
              // exhaust device resources.
              break;
            }
          }

          // If an unknown key was rejected, skip known entries entirely
          if (dataset.issues) {
            // @ts-expect-error
            return dataset as OutputDataset<
              InferObjectOutput<ObjectEntries> & { [key: string]: unknown },
              LooseObjectIssue | InferObjectIssue<ObjectEntries>
            >;
          }
        }

        // Pipeline step 2: Process each object entry of schema
        for (const key in this.entries) {
          const valueSchema = this.entries[key];
          const isKeyPresent = key in input;

          // If key is present or its an optional schema with a default value,
          // parse input of key or default value
          if (
            isKeyPresent ||
            ((valueSchema.type === 'exact_optional' ||
              valueSchema.type === 'optional' ||
              valueSchema.type === 'nullish') &&
              // @ts-expect-error
              valueSchema.default !== undefined)
          ) {
            const value: unknown = isKeyPresent
              ? // @ts-expect-error
                input[key]
              : getDefault(valueSchema);
            const valueDataset = valueSchema['~run']({ value }, config);

            // If there are issues, capture them
            if (valueDataset.issues) {
              // Create object path item
              const pathItem: ObjectPathItem = {
                type: 'object',
                origin: 'value',
                input: input as Record<string, unknown>,
                key,
                value,
              };

              // Add modified entry dataset issues to issues
              for (const issue of valueDataset.issues) {
                if (issue.path) {
                  issue.path.unshift(pathItem);
                } else {
                  // @ts-expect-error
                  issue.path = [pathItem];
                }
                // @ts-expect-error
                dataset.issues?.push(issue);
              }
              if (!dataset.issues) {
                // @ts-expect-error
                dataset.issues = valueDataset.issues;
              }

              // If necessary, abort early
              if (config.abortEarly) {
                dataset.typed = false;
                break;
              }
            }

            // If not typed, set typed to `false`
            if (!valueDataset.typed) {
              dataset.typed = false;
            }

            // Add entry to dataset
            // @ts-expect-error
            dataset.value[key] = valueDataset.value;

            // Otherwise, if key is missing but has a fallback, use it
            // @ts-expect-error
          } else if (valueSchema.fallback !== undefined) {
            // @ts-expect-error
            dataset.value[key] = getFallback(valueSchema);

            // Otherwise, if key is missing and required, add issue
          } else if (
            valueSchema.type !== 'exact_optional' &&
            valueSchema.type !== 'optional' &&
            valueSchema.type !== 'nullish'
          ) {
            _addIssue(this, 'key', dataset, config, {
              input: undefined,
              expected: `"${key}"`,
              path: [
                {
                  type: 'object',
                  origin: 'key',
                  input: input as Record<string, unknown>,
                  key,
                  // @ts-expect-error
                  value: input[key],
                },
              ],
            });

            // If necessary, abort early
            if (config.abortEarly) {
              break;
            }
          }
        }

        // Pipeline step 3: Add rest to dataset if policy is `'keep'`
        // Hint: We exclude specific keys for security reasons
        if (
          unknownKeys === 'keep' &&
          (!dataset.issues || !config.abortEarly)
        ) {
          for (const key in input) {
            if (
              _isValidObjectKey(input, key) &&
              !Object.prototype.hasOwnProperty.call(this.entries, key)
            ) {
              // @ts-expect-error
              dataset.value[key] = input[key];
            }
          }
        }

        // Otherwise, add object issue
      } else {
        _addIssue(this, 'type', dataset, config);
      }

      // Return output dataset
      // @ts-expect-error
      return dataset as OutputDataset<
        InferObjectOutput<ObjectEntries> & { [key: string]: unknown },
        LooseObjectIssue | InferObjectIssue<ObjectEntries>
      >;
    },
  });
}
