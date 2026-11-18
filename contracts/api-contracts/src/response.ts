import { z } from 'zod';

// Response schemas are strict so a field the serializer starts sending fails
// the e2e checks instead of passing unnoticed.

export const id = z.string().regex(/^[a-f\d]{24}$/);

/** Dates serialize as ISO 8601 UTC strings. */
export const datetime = z.iso.datetime();

export const pagination = z.strictObject({
  page: z.number().int().positive(),
  limit: z.union([z.number().int().positive(), z.literal('all')]),
  pages: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  next: z.number().int().positive().nullable(),
  prev: z.number().int().positive().nullable(),
});

const meta = z.strictObject({ pagination });

export type Pagination = z.output<typeof pagination>;

/** Schema for a browse response: `{[key]: Item[], meta}`. */
export const browseResponse = <const Key extends string, Item extends z.ZodType>(
  key: Key,
  item: Item,
) =>
  z.strictObject({ [key]: z.array(item), meta } as { [K in Key]: z.ZodArray<Item> } & {
    meta: typeof meta;
  });

/** Schema for a read, add or edit response: `{[key]: [Item]}`. */
export const resourceResponse = <const Key extends string, Item extends z.ZodType>(
  key: Key,
  item: Item,
) => z.strictObject({ [key]: z.tuple([item]) } as { [K in Key]: z.ZodTuple<[Item], null> });
