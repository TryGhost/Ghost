import type { Controller, Frame } from '@tryghost/api-framework';
import errors from '@tryghost/errors';
import { z } from 'zod';
import { actingContext, service } from '../../services/app-installations';

interface InstallationOptions {
  id: string;
  context: unknown;
  // What `include` asked for, as the framework passes it on.
  withRelated?: string[];
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
 * What a publisher confirms: the manifest URL they reviewed and the digest of what they
 * were shown. The manifest itself never comes from the browser.
 */
const ReviewedManifest = z.object({ manifest_url: z.string(), digest: z.string() });

/** What approving confirms on top: the revision of the installation the review was shown against. */
const ReviewedRevision = z.object({ revision: z.number().int().nonnegative() });

function reviewed(frame: WriteFrame): { manifestUrl: string; digest: string } {
  const parsed = ReviewedManifest.safeParse(frame.data.app_installations[0]);
  if (!parsed.success) {
    throw new errors.ValidationError({
      message: 'Expected the manifest_url and digest of the reviewed manifest.',
    });
  }
  return { manifestUrl: parsed.data.manifest_url, digest: parsed.data.digest };
}

function reviewedChange(frame: WriteFrame) {
  const parsed = ReviewedRevision.safeParse(frame.data.app_installations[0]);
  if (!parsed.success) {
    throw new errors.ValidationError({
      message: 'Expected the revision of the installation that was reviewed.',
    });
  }
  return { ...reviewed(frame), revision: parsed.data.revision };
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
    options: ['id', 'include'],
    validation: { options: { id: { required: true }, include: { values: ['history'] } } },
    permissions: true,
    query(frame: ReadFrame) {
      return service!.read(frame.options.id, {
        withHistory: frame.options.withRelated?.includes('history') ?? false,
      });
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
