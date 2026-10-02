import type { Controller, Frame } from '@tryghost/api-framework';
import { service, type RequestContext } from '../../services/gift-links';

const permissionsService = require('../../services/permissions');

type GiftLinksFrame = Frame<{
  options: {
    id: string;
    context: unknown;
    [key: string]: unknown;
  };
}>;

async function assertCanEditAndGift(frame: GiftLinksFrame): Promise<void> {
  const { context, id } = frame.options;
  await permissionsService.canThis(context).manage.gift_link(id);
  await permissionsService.canThis(context).edit.post(id);
}

function requestContextFromFrame(frame: GiftLinksFrame): RequestContext {
  const context = (frame.options.context ?? {}) as { user?: string; integration?: { id: string } };
  if (context.integration) {
    return { actor: { id: context.integration.id, type: 'integration' } };
  }
  if (context.user) {
    return { actor: { id: context.user, type: 'user' } };
  }
  return { actor: null };
}

const noCacheInvalidation = { cacheInvalidate: false };

const controller = {
  docName: 'gift_links',

  browse: {
    headers: noCacheInvalidation,
    options: ['id'],
    validation: { options: { id: { required: true } } },
    permissions(frame: GiftLinksFrame) {
      return assertCanEditAndGift(frame);
    },
    query(frame: GiftLinksFrame) {
      return service!.getPost(frame.options.id);
    },
  },

  ensure: {
    headers: noCacheInvalidation,
    statusCode: 200,
    options: ['id'],
    validation: { options: { id: { required: true } } },
    permissions(frame: GiftLinksFrame) {
      return assertCanEditAndGift(frame);
    },
    query(frame: GiftLinksFrame) {
      return service!.ensure(requestContextFromFrame(frame), frame.options.id);
    },
  },

  create: {
    headers: noCacheInvalidation,
    statusCode: 200,
    options: ['id'],
    validation: { options: { id: { required: true } } },
    permissions(frame: GiftLinksFrame) {
      return assertCanEditAndGift(frame);
    },
    query(frame: GiftLinksFrame) {
      return service!.create(requestContextFromFrame(frame), frame.options.id);
    },
  },

  removeAll: {
    headers: noCacheInvalidation,
    statusCode: 200,
    permissions(frame: GiftLinksFrame) {
      return permissionsService.canThis(frame.options.context).removeAll.gift_link();
    },
    async query(frame: GiftLinksFrame) {
      const count = await service!.removeAll(requestContextFromFrame(frame));
      return { count };
    },
  },
} satisfies Controller<{
  browse: GiftLinksFrame;
  ensure: GiftLinksFrame;
  create: GiftLinksFrame;
  removeAll: GiftLinksFrame;
}>;

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
