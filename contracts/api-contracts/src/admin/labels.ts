import { z } from 'zod';
import * as options from '../options.ts';
import { resourceBody } from '../resource-body.ts';
import { browseResponse, datetime, id, resourceResponse } from '../response.ts';

export const INCLUDES = ['count.members'] as const;

const include = options.include(INCLUDES);

const label = z.object({
  // A leading comma would split the label when it is written as a list.
  name: z
    .string()
    .min(1)
    .max(191)
    .regex(/^([^,]|$)/),
  slug: z.string().max(191).nullable().optional(),
});

export const browse = {
  options: z.object({
    include: include.optional(),
    filter: options.filter,
    fields: options.fields,
    limit: options.limit.optional(),
    order: options.order.optional(),
    page: options.page.optional(),
  }),
};

export const read = {
  options: z.object({
    id: options.id.optional(),
    slug: options.slug.optional(),
    include: include.optional(),
    filter: options.filter,
    fields: options.fields,
  }),
};

export const add = {
  options: z.object({ include: include.optional() }),
  body: resourceBody('labels', label),
};

export const edit = {
  options: z.object({ id: options.id, include: include.optional() }),
  body: resourceBody('labels', label.partial()),
};

export const destroy = {
  options: z.object({ id: options.id }),
};

// Responses. `fields` narrows records to the requested columns; it isn't modelled
// here, so callers that use it should `.pick()` from `record`.

export const record = z.strictObject({
  id,
  name: z.string(),
  slug: z.string(),
  created_at: datetime,
  updated_at: datetime.nullable(),
});

/** A label read with `include=count.members`. */
export const recordWithMemberCount = record.extend({
  count: z.strictObject({ members: z.number().int().nonnegative() }),
});

const responsesOf = <Item extends z.ZodType>(item: Item) => ({
  browse: browseResponse('labels', item),
  read: resourceResponse('labels', item),
  add: resourceResponse('labels', item),
  edit: resourceResponse('labels', item),
});

export const responses = responsesOf(record);
export const responsesWithMemberCount = responsesOf(recordWithMemberCount);

/** The response schemas for a request's parsed options. */
export const responsesFor = (request: { include?: readonly string[] }) =>
  request.include?.includes('count.members') ? responsesWithMemberCount : responses;

export type LabelRecord = z.output<typeof record>;
export type LabelRecordWithMemberCount = z.output<typeof recordWithMemberCount>;
export type LabelsBrowseResponse = z.output<typeof responses.browse>;
export type LabelsBrowseResponseWithMemberCount = z.output<typeof responsesWithMemberCount.browse>;
/** The body of a `read`, `add` or `edit` response. */
export type LabelResponse = z.output<typeof responses.read>;
export type LabelResponseWithMemberCount = z.output<typeof responsesWithMemberCount.read>;
