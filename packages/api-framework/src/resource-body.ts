import { z } from 'zod';

/** The body on the wire: one resource in an array under its root key. */
type ResourceEnvelope<Key extends string, Resource> = { [K in Key]: [Resource] };

/**
 * Schema for a body carrying one resource under a root key, as in `{labels: [{...}]}`.
 *
 * Parses to the resource itself. `z.input` is still the body as sent.
 */
export function resourceBody<const Key extends string, Item extends z.ZodType>(
  key: Key,
  item: Item,
): z.ZodType<z.output<Item>, ResourceEnvelope<Key, z.input<Item>>> {
  return (
    z
      // Not a tuple: a tuple lets an item with a default stand in for an empty array
      .object({ [key]: z.array(item).length(1) })
      .transform((body) => (body[key] as z.output<Item>[])[0]) as unknown as z.ZodType<
      z.output<Item>,
      ResourceEnvelope<Key, z.input<Item>>
    >
  );
}
