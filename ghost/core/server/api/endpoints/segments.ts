import {
  type Controller,
  defineMethod,
  type InferMethodFrame,
  resourceBody,
} from '@tryghost/api-framework';
import { z } from 'zod';
import { actingContext } from '../../lib/actor';
import segments from '../../services/segments';
import { NewSegmentBody, SegmentEditBody, SegmentRoute } from '../../services/segments/serializers';

// Segments only appear in Admin, so changing one doesn't invalidate the site's cache.
const noCacheInvalidation = { cacheInvalidate: false };

const browse = defineMethod({
  headers: noCacheInvalidation,
  // Browse takes no options; the empty schema lets it parse its request like the others.
  schema: { options: z.object({}) },
  permissions: true,
  query() {
    return segments.service.browse();
  },
});

const read = defineMethod({
  headers: noCacheInvalidation,
  schema: { options: SegmentRoute },
  permissions: true,
  query(frame) {
    return segments.service.read(frame.validated.options.id);
  },
});

const add = defineMethod({
  statusCode: 201,
  headers: noCacheInvalidation,
  schema: { body: resourceBody('segments', NewSegmentBody) },
  permissions: true,
  query(frame) {
    return segments.service.add(actingContext(frame.options.context), frame.validated.body);
  },
});

const edit = defineMethod({
  headers: noCacheInvalidation,
  schema: { options: SegmentRoute, body: resourceBody('segments', SegmentEditBody) },
  permissions: true,
  query(frame) {
    return segments.service.edit(
      actingContext(frame.options.context),
      frame.validated.options.id,
      frame.validated.body,
    );
  },
});

const destroy = defineMethod({
  statusCode: 204,
  headers: noCacheInvalidation,
  schema: { options: SegmentRoute },
  permissions: true,
  query(frame) {
    return segments.service.destroy(
      actingContext(frame.options.context),
      frame.validated.options.id,
    );
  },
});

const controller = {
  docName: 'segments',
  browse,
  read,
  add,
  edit,
  destroy,
} satisfies Controller<{
  browse: InferMethodFrame<typeof browse>;
  read: InferMethodFrame<typeof read>;
  add: InferMethodFrame<typeof add>;
  edit: InferMethodFrame<typeof edit>;
  destroy: InferMethodFrame<typeof destroy>;
}>;

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
