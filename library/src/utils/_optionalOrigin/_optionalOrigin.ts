/**
 * Any dataset shape that may carry origin metadata.
 *
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface AnyDataset { value: any; typed?: boolean; issues?: unknown }

/**
 * Origin of an optional field value.
 *
 * - `missing`: The key was not present on the input object.
 * - `undefined`: The key was present and explicitly set to `undefined`.
 * - `value`: The key was present with a regular value (`null` included).
 */
export type OptionalOrigin = 'missing' | 'undefined' | 'value';

/**
 * Optional origin path map type.
 *
 * The keys are dot paths of the tracked field (e.g. `user.name`) and the
 * values describe where the final value of that field came from.
 */
export type OptionalOrigins = Readonly<Record<string, OptionalOrigin>>;

/**
 * Symbol used to attach the origin of a single value to a dataset.
 *
 * @internal
 */
export const ORIGIN_SYMBOL: unique symbol = Symbol.for('valibot.origin');

/**
 * Symbol used to attach the collected origin path map to a dataset.
 *
 * @internal
 */
export const ORIGINS_SYMBOL: unique symbol = Symbol.for('valibot.origins');

/**
 * Dataset with optional origin metadata.
 *
 * @internal
 */
export interface OriginDataset {
  /**
   * The dataset value.
   */
  value: unknown;
  [ORIGIN_SYMBOL]?: OptionalOrigin;
  [ORIGINS_SYMBOL]?: Record<string, OptionalOrigin>;
}

/**
 * Returns the origin of a dataset value if it has been tracked.
 *
 * @param dataset The dataset.
 *
 * @returns The origin or `undefined`.
 *
 * @internal
 */
// @__NO_SIDE_EFFECTS__
export function _getOrigin(
  dataset: AnyDataset
): OptionalOrigin | undefined {
  return (dataset as OriginDataset)[ORIGIN_SYMBOL];
}

/**
 * Sets the origin of a dataset value.
 *
 * @param dataset The dataset.
 * @param origin The origin.
 *
 * @internal
 */
// @__NO_SIDE_EFFECTS__
export function _setOrigin(
  dataset: AnyDataset,
  origin: OptionalOrigin
): void {
  const originDataset = dataset as OriginDataset;
  if (originDataset[ORIGIN_SYMBOL] === undefined) {
    Object.defineProperty(originDataset, ORIGIN_SYMBOL, {
      value: origin,
      enumerable: false,
      writable: true,
      configurable: true,
    });
  }
}

/**
 * Creates a dataset for an object entry and marks the origin of its value.
 *
 * @param value The entry value.
 * @param isKeyPresent Whether the key was present on the input object.
 * @param trackOrigin Whether the entry schema is able to consume the origin.
 *
 * @returns The entry dataset.
 *
 * @internal
 */
// @__NO_SIDE_EFFECTS__
export function _createEntryDataset(
  value: unknown,
  isKeyPresent: boolean,
  trackOrigin: boolean
): OriginDataset {
  const dataset: OriginDataset = { value };
  if (trackOrigin) {
    Object.defineProperty(dataset, ORIGIN_SYMBOL, {
      value: !isKeyPresent
        ? ('missing' as const)
        : value === undefined
          ? ('undefined' as const)
          : ('value' as const),
      enumerable: false,
      writable: true,
      configurable: true,
    });
  }
  return dataset;
}

/**
 * Collects the origins of an entry dataset into an origins map.
 *
 * @param origins The origins map to collect into.
 * @param key The key of the object entry.
 * @param dataset The entry dataset.
 *
 * @internal
 */
// @__NO_SIDE_EFFECTS__
export function _collectOrigins(
  origins: Record<string, OptionalOrigin>,
  key: PropertyKey,
  dataset: AnyDataset
): void {
  const originDataset = dataset as OriginDataset;

  // Collect the origin of the optional entry itself
  const origin = originDataset[ORIGIN_SYMBOL];
  if (
    origin !== undefined &&
    (typeof key === 'string' || typeof key === 'number')
  ) {
    origins[key] = origin;
  }

  // Bubble nested origins up to the parent
  _bubbleOrigins(origins, key, dataset);
}

/**
 * Bubbles the origins map of a nested entry value up to the origins map of
 * its parent, prefixing every nested dot path with the entry key.
 *
 * This runs for every entry, not only optional-like ones, so that origins
 * nested inside plain object entries reach the root output.
 *
 * @param origins The origins map to collect into.
 * @param key The key of the object entry.
 * @param dataset The entry dataset.
 *
 * @internal
 */
// @__NO_SIDE_EFFECTS__
export function _bubbleOrigins(
  origins: Record<string, OptionalOrigin>,
  key: PropertyKey,
  dataset: AnyDataset
): void {
  const originDataset = dataset as OriginDataset;
  let nestedOrigins = originDataset[ORIGINS_SYMBOL];
  if (!nestedOrigins) {
    const value = originDataset.value;
    if (value && (typeof value === 'object' || typeof value === 'function')) {
      nestedOrigins = (value as OriginDataset)[ORIGINS_SYMBOL];
    }
  }
  if (nestedOrigins) {
    for (const nestedKey in nestedOrigins) {
      origins[`${String(key)}.${nestedKey}`] = nestedOrigins[nestedKey];
    }
  }
}

/**
 * Attaches the origin of a single optional entry to its output value if that
 * value is an object (primitive values cannot carry symbol properties and are
 * only tracked in the parent origins map).
 *
 * @param dataset The entry dataset.
 *
 * @internal
 */
// @__NO_SIDE_EFFECTS__
export function _attachEntryOrigin(dataset: AnyDataset): void {
  const originDataset = dataset as OriginDataset;
  const origin = originDataset[ORIGIN_SYMBOL];
  const value = originDataset.value;
  if (
    origin !== undefined &&
    value &&
    (typeof value === 'object' || typeof value === 'function')
  ) {
    const target = value as Record<symbol, unknown>;
    if (target[ORIGIN_SYMBOL] === undefined) {
      Object.defineProperty(target, ORIGIN_SYMBOL, {
        value: origin,
        enumerable: false,
        writable: true,
        configurable: true,
      });
    }
  }
}

/**
 * Attaches an origins map to a value as a non-enumerable symbol property so
 * that the metadata travels with the transformed output without showing up as
 * a regular entry on the user object.
 *
 * @param value The output value.
 * @param origins The origins map.
 *
 * @returns The output value.
 *
 * @internal
 */
// @__NO_SIDE_EFFECTS__
export function _attachOrigins<TValue>(
  value: TValue,
  origins?: Record<string, OptionalOrigin>
): TValue {
  if (origins && value && (typeof value === 'object' || typeof value === 'function')) {
    Object.defineProperty(value, ORIGINS_SYMBOL, {
      value: origins,
      enumerable: false,
      writable: true,
      configurable: true,
    });
  }
  return value;
}

/**
 * Finalizes the origin metadata of a root dataset at the parse boundary.
 *
 * Any origin metadata still sitting on the dataset itself (e.g. when an
 * optional schema was parsed standalone) is attached to the output value as a
 * non-enumerable symbol property.
 *
 * @param dataset The root output dataset.
 *
 * @internal
 */
// @__NO_SIDE_EFFECTS__
export function _finalizeOrigins(dataset: AnyDataset): void {
  const originDataset = dataset as OriginDataset;
  const { value } = originDataset;
  if (value && (typeof value === 'object' || typeof value === 'function')) {
    const target = value as Record<symbol, unknown>;
    const origin = originDataset[ORIGIN_SYMBOL];
    if (origin !== undefined && target[ORIGIN_SYMBOL] === undefined) {
      Object.defineProperty(target, ORIGIN_SYMBOL, {
        value: origin,
        enumerable: false,
        writable: true,
        configurable: true,
      });
    }
    const origins = originDataset[ORIGINS_SYMBOL];
    if (origins !== undefined && target[ORIGINS_SYMBOL] === undefined) {
      Object.defineProperty(target, ORIGINS_SYMBOL, {
        value: origins,
        enumerable: false,
        writable: true,
        configurable: true,
      });
    }
  }
}

/**
 * Lets the origin metadata follow a transformed value.
 *
 * If the previous value carried origin metadata and the new value is an
 * object, the metadata is copied over to the new value so that
 * transformations do not lose the origin information.
 *
 * @param dataset The dataset whose value was transformed.
 * @param previousValue The value before the transformation.
 *
 * @internal
 */
// @__NO_SIDE_EFFECTS__
export function _followTransform(
  dataset: AnyDataset,
  previousValue: unknown
): void {
  const isObject = (
    value: unknown
  ): value is Record<symbol, unknown> =>
    !!value &&
    (typeof value === 'object' || typeof value === 'function');

  const next = dataset.value;
  if (
    previousValue !== next &&
    isObject(previousValue) &&
    isObject(next)
  ) {
    const origin = previousValue[ORIGIN_SYMBOL];
    if (origin !== undefined && next[ORIGIN_SYMBOL] === undefined) {
      Object.defineProperty(next, ORIGIN_SYMBOL, {
        value: origin,
        enumerable: false,
        writable: true,
        configurable: true,
      });
    }
    const origins = previousValue[ORIGINS_SYMBOL];
    if (origins !== undefined && next[ORIGINS_SYMBOL] === undefined) {
      Object.defineProperty(next, ORIGINS_SYMBOL, {
        value: origins,
        enumerable: false,
        writable: true,
        configurable: true,
      });
    }
  }
}

/**
 * Returns the origin of a single parsed value if available.
 *
 * @param value The parsed output value.
 *
 * @returns The origin or `undefined`.
 */
// @__NO_SIDE_EFFECTS__
export function getOrigin(value: unknown): OptionalOrigin | undefined {
  // Hint: Primitive values cannot carry symbol properties, so only object and
  // function values are inspected.
  return value && (typeof value === 'object' || typeof value === 'function')
    ? (value as Record<symbol, unknown>)[ORIGIN_SYMBOL] as
        | OptionalOrigin
        | undefined
    : undefined;
}

/**
 * Returns the optional origin path map of a parsed object output.
 *
 * @param value The parsed output value.
 *
 * @returns The origins map or `undefined`.
 */
// @__NO_SIDE_EFFECTS__
export function getOrigins(value: unknown): OptionalOrigins | undefined {
  return value && (typeof value === 'object' || typeof value === 'function')
    ? ((value as Record<symbol, unknown>)[ORIGINS_SYMBOL] as
        | OptionalOrigins
        | undefined)
    : undefined;
}
