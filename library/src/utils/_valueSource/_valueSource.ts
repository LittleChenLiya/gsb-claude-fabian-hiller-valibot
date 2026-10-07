/**
 * Value source type.
 *
 * Describes where the value parsed by an `optional` schema came from:
 * `'missing'` if the key was not provided, `'undefined'` if the key was
 * explicitly set to `undefined`, and `'value'` if a normal value (including
 * `null`) was provided.
 */
export type ValueSource = 'missing' | 'undefined' | 'value';

/**
 * Value source entry interface.
 */
export interface ValueSourceEntry {
  /**
   * The path of the value within the input.
   */
  readonly path: readonly PropertyKey[];
  /**
   * The source of the value.
   */
  readonly source: ValueSource;
}

/**
 * Value source entries symbol.
 *
 * Hint: The metadata is stored under a symbol key on the internal dataset
 * object. It travels with the dataset through defaults and transformations,
 * but is never written to the user-facing output object.
 *
 * @internal
 */
export const ValueSourceEntries: unique symbol = Symbol(
  'valibot.valueSourceEntries'
);

/**
 * Value source hint symbol.
 *
 * Hint: Object schemas use this symbol to tell a wrapped `optional` schema
 * that the key of the value was missing in the input object.
 *
 * @internal
 */
export const ValueSourceHint: unique symbol = Symbol('valibot.valueSourceHint');

/**
 * Dataset with value source interface.
 *
 * @internal
 */
interface DatasetWithValueSource {
  /**
   * The collected value source entries.
   */
  [ValueSourceEntries]?: {
    path: PropertyKey[];
    source: ValueSource;
  }[];
  /**
   * The value source hint.
   */
  [ValueSourceHint]?: ValueSource;
}

/**
 * Adds a value source entry to the dataset.
 *
 * @param dataset The dataset object.
 * @param source The source of the value.
 * @param path The path of the value.
 *
 * @internal
 */
export function _addValueSource(
  dataset: unknown,
  source: ValueSource,
  path: PropertyKey[] = []
): void {
  let entries = (dataset as DatasetWithValueSource)[ValueSourceEntries];
  if (!entries) {
    entries = [];
    // Hint: The property is non-enumerable so that the metadata neither
    // changes the shape of the dataset nor leaks into user-facing objects.
    Object.defineProperty(dataset, ValueSourceEntries, {
      value: entries,
      writable: true,
      configurable: true,
    });
  }
  entries.push({ path, source });
}

/**
 * Merges the value source entries of a child dataset into its parent dataset
 * by prepending the key of the child to every path.
 *
 * @param dataset The parent dataset object.
 * @param childDataset The child dataset object.
 * @param key The key of the child within its parent.
 *
 * @internal
 */
export function _mergeValueSources(
  dataset: unknown,
  childDataset: unknown,
  key: string
): void {
  const childEntries = (childDataset as DatasetWithValueSource)[
    ValueSourceEntries
  ];
  if (childEntries) {
    for (const entry of childEntries) {
      _addValueSource(dataset, entry.source, [key, ...entry.path]);
    }
  }
}

/**
 * Returns a detached copy of the value source entries of the dataset.
 *
 * @param dataset The dataset object.
 *
 * @returns The value source entries.
 *
 * @internal
 */
export function _getValueSources(dataset: unknown): ValueSourceEntry[] {
  const entries = (dataset as DatasetWithValueSource)[ValueSourceEntries];
  return entries
    ? entries.map((entry) => ({ path: [...entry.path], source: entry.source }))
    : [];
}
