import { Readable } from 'node:stream';

/** Serialized text is batched into chunks of roughly this many characters. */
const CHUNK_SIZE = 64 * 1024;

/** An object JSON.stringify would walk into rather than serialize via `toJSON`. */
function isContainer(value: unknown): value is object {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as { toJSON?: unknown }).toJSON !== 'function'
  );
}

/** A container with no nested containers, such as a database row. */
function isFlat(value: object): boolean {
  for (const child of Object.values(value)) {
    if (isContainer(child)) {
      return false;
    }
  }
  return true;
}

function* serializeContainer(value: object, ancestors: Set<object>): Generator<string> {
  if (ancestors.has(value)) {
    throw new TypeError('Converting circular structure to JSON');
  }
  ancestors.add(value);

  if (Array.isArray(value)) {
    yield '[';
    for (let i = 0; i < value.length; i++) {
      const separator = i === 0 ? '' : ',';
      const child: unknown = value[i];

      if (isContainer(child) && !isFlat(child)) {
        yield separator;
        yield* serializeContainer(child, ancestors);
      } else {
        // Unserializable values become null inside arrays, matching JSON.stringify
        yield separator + (JSON.stringify(child) ?? 'null');
      }
    }
    yield ']';
  } else {
    yield '{';
    let first = true;
    for (const [key, child] of Object.entries(value)) {
      if (isContainer(child) && !isFlat(child)) {
        yield `${first ? '' : ','}${JSON.stringify(key)}:`;
        yield* serializeContainer(child, ancestors);
      } else {
        const json = JSON.stringify(child);
        // Unserializable values are omitted from objects, matching JSON.stringify
        if (json === undefined) {
          continue;
        }
        yield `${first ? '' : ','}${JSON.stringify(key)}:${json}`;
      }
      first = false;
    }
    yield '}';
  }

  ancestors.delete(value);
}

function* batch(parts: Iterable<string>): Generator<string> {
  let buffered = '';
  for (const part of parts) {
    buffered += part;
    if (buffered.length >= CHUNK_SIZE) {
      yield buffered;
      buffered = '';
    }
  }
  if (buffered) {
    yield buffered;
  }
}

/**
 * Serializes `value` as a stream of JSON text, identical to
 * `JSON.stringify(value)` but never held in memory as one string.
 *
 * A large export can serialize to more text than V8's maximum string length
 * (about 512 MB), at which point `JSON.stringify` throws
 * `RangeError: Invalid string length`. Nested arrays and objects are walked
 * here; each flat value such as a database row is handed to `JSON.stringify`
 * whole, so the native serializer still does the bulk of the work.
 *
 * Serialization runs lazily as the stream is read, so a serialization error
 * (a circular reference or a BigInt) is emitted as a stream error.
 */
export function createJsonStream(value: object): Readable {
  const parts = isContainer(value)
    ? serializeContainer(value, new Set())
    : [JSON.stringify(value) ?? 'null'];

  return Readable.from(batch(parts), { objectMode: false });
}
