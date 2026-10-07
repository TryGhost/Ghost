import type { Controller, Frame } from '@tryghost/api-framework';
import errors from '@tryghost/errors';
import { actingContext, service } from '../../services/app-installations';

interface InstallationOptions {
  id: string;
  context: unknown;
  [key: string]: unknown;
}

type ReadFrame = Frame<{ options: InstallationOptions }>;

// The framework refuses a body without a non-empty `app_installations` array before any
// handler runs; what is inside it is checked here.
type WriteFrame = Frame<{
  data: { app_installations: Array<Record<string, unknown>> };
  options: InstallationOptions;
}>;

/**
 * What a publisher confirms: the manifest URL they reviewed and the digest of the manifest
 * they were shown. The manifest itself never comes from the browser.
 */
function reviewed(frame: WriteFrame): { manifestUrl: string; digest: string } {
  const [input] = frame.data.app_installations;
  const manifestUrl = input?.manifest_url;
  const digest = input?.digest;
  if (typeof manifestUrl !== 'string' || typeof digest !== 'string') {
    throw new errors.ValidationError({
      message: 'Expected the manifest_url and digest of the reviewed manifest.',
    });
  }
  return { manifestUrl, digest };
}

/** What approving confirms on top: the revision of the installation the review was shown against. */
function reviewedChange(frame: WriteFrame) {
  const revision = frame.data.app_installations[0]?.revision;
  if (typeof revision !== 'number') {
    throw new errors.ValidationError({
      message: 'Expected the revision of the installation that was reviewed.',
    });
  }
  return { ...reviewed(frame), revision };
}

const noCacheInvalidation = { cacheInvalidate: false };

const controller = {
  docName: 'app_installations',

  browse: {
    headers: noCacheInvalidation,
    permissions: true,
    async query() {
      return { data: await service!.browse() };
    },
  },

  read: {
    headers: noCacheInvalidation,
    options: ['id'],
    validation: { options: { id: { required: true } } },
    permissions: true,
    query(frame: ReadFrame) {
      return service!.read(frame.options.id);
    },
  },

  add: {
    statusCode: 201,
    headers: noCacheInvalidation,
    permissions: true,
    query(frame: WriteFrame) {
      return service!.create(actingContext(frame.options.context), reviewed(frame));
    },
  },

  // Approves changes to an installation, including the app moving somewhere new. Approving
  // is a decision of the same weight as installing, so it takes the same permission.
  edit: {
    headers: noCacheInvalidation,
    options: ['id'],
    validation: { options: { id: { required: true } } },
    permissions: { method: 'add' },
    query(frame: WriteFrame) {
      return service!.approve(
        actingContext(frame.options.context),
        frame.options.id,
        reviewedChange(frame),
      );
    },
  },

  destroy: {
    statusCode: 204,
    headers: noCacheInvalidation,
    options: ['id'],
    validation: { options: { id: { required: true } } },
    permissions: true,
    query(frame: ReadFrame) {
      return service!.uninstall(actingContext(frame.options.context), frame.options.id);
    },
  },
} satisfies Controller<{
  browse: ReadFrame;
  read: ReadFrame;
  add: WriteFrame;
  edit: WriteFrame;
  destroy: ReadFrame;
}>;

module.exports = controller;
