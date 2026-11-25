const urlUtils = require('../../../shared/url-utils').default;
const models = require('../../models');
const { getCSVExportFileName } = require('./utils/csv-export-filename');
const getPostServiceInstance = require('../../services/posts/posts-service-instance');
const contentImportService = require('../../services/content-import');
const errors = require('@tryghost/errors');
const { http, pipeline } = require('@tryghost/api-framework');
const { restrictAdminApiQueryOptions } = require('./utils/api-filter-utils');
const allowedIncludes = [
  'tags',
  'authors',
  'authors.roles',
  'email',
  'tiers',
  'newsletter',
  'count.conversions',
  'count.signups',
  'count.paid_conversions',
  'count.clicks',
  'sentiment',
  'count.positive_feedback',
  'count.negative_feedback',
  'post_revisions',
  'post_revisions.author',
];
const unsafeAttrs = ['status', 'authors', 'visibility'];

const postsService = getPostServiceInstance();
const importPermissions = { docName: 'content_imports', method: 'importContent' };

function csvUploadOwner(frame) {
  return frame.options.context.integration
    ? { type: 'integration', id: frame.options.context.integration.id }
    : { type: 'user', id: frame.user.id };
}

/**
 * @param {string} event
 */
function getCacheHeaderFromEventString(event, dto) {
  if (event === 'published_updated' || event === 'unpublished') {
    return true;
  }
  if (event === 'scheduled_updated' || event === 'draft_updated') {
    const baseUrl = urlUtils.urlFor({
      relativeUrl: urlUtils.urlJoin('/p', dto.uuid, '/'),
    });
    return {
      value: [
        baseUrl,
        `${baseUrl}?member_status=anonymous`,
        `${baseUrl}?member_status=free`,
        `${baseUrl}?member_status=paid`,
      ].join(', '),
    };
  }
}

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'posts',
  browse: {
    headers: {
      cacheInvalidate: false,
    },
    options: [
      'include',
      'filter',
      'fields',
      'collection',
      'formats',
      'limit',
      'order',
      'page',
      'debug',
      'absolute_urls',
    ],
    validation: {
      options: {
        include: {
          values: allowedIncludes,
        },
        formats: {
          values: models.Post.allowedFormats,
        },
      },
    },
    permissions: {
      unsafeAttrs: unsafeAttrs,
    },
    query(frame) {
      return postsService.browsePosts(restrictAdminApiQueryOptions(frame.options));
    },
  },

  exportCSV: {
    options: ['limit', 'filter', 'order'],
    headers: {
      disposition: {
        type: 'csv',
        value() {
          return getCSVExportFileName('analytics');
        },
      },
      cacheInvalidate: false,
    },
    response: {
      format: 'plain',
      stream: true,
    },
    permissions: {
      method: 'browse',
    },
    validation: {},
    async query(frame) {
      return {
        data: await postsService.export(restrictAdminApiQueryOptions(frame.options)),
        filename: getCSVExportFileName('analytics'),
      };
    },
  },

  importCSV: {
    statusCode: 202,
    headers: {
      cacheInvalidate: false,
    },
    permissions: importPermissions,
    async query(frame) {
      // The content-import service stages and validates the upload before this response;
      // Multer deletes the request temp file as soon as the 202 is sent.
      const requestUserEmail = frame.user ? frame.user.get('email') : null;
      const owner = csvUploadOwner(frame);
      const uploadId = frame.data.upload_id;
      if (uploadId !== undefined) {
        if (frame.file?.path) {
          throw new errors.ValidationError({
            message: 'Submit either a file or a staged CSV upload, not both.',
          });
        }
        const { importId, total } = await contentImportService.confirmCSV({
          uploadId,
          owner,
          requestUserEmail,
          mapping: frame.data.mapping,
        });
        return { meta: { import_id: importId, total } };
      }
      const { importId, total } = await contentImportService.importCSV({
        filePath: frame.file.path,
        fileName: frame.file.name,
        mapping: frame.data.mapping,
        requestUserEmail,
        owner,
      });
      return { meta: { import_id: importId, total } };
    },
  },

  inspectCSV: {
    headers: { cacheInvalidate: false },
    permissions: importPermissions,
    async query(frame) {
      if (await contentImportService.isLegacyImportZip(frame.file.path, frame.file.name)) {
        // Run the original HTTP controller on the same spooled multipart file.
        // It still owns legacy permissions, headers, staging and import behavior.
        const legacy = pipeline(require('./db'), require('./utils'));
        return http(legacy.importContent);
      }
      return {
        meta: await contentImportService.inspectCSV({
          filePath: frame.file.path,
          fileName: frame.file.name,
          owner: csvUploadOwner(frame),
        }),
      };
    },
  },

  cancelCSVUpload: {
    headers: { cacheInvalidate: false },
    permissions: importPermissions,
    statusCode: 204,
    options: ['upload_id'],
    async query(frame) {
      await contentImportService.cancelUpload(frame.options.upload_id, csvUploadOwner(frame));
    },
  },

  read: {
    headers: {
      cacheInvalidate: false,
    },
    options: [
      'include',
      'fields',
      'formats',
      'debug',
      'absolute_urls',
      // NOTE: only for internal context
      'forUpdate',
      'transacting',
    ],
    data: ['id', 'slug', 'uuid'],
    validation: {
      options: {
        include: {
          values: allowedIncludes,
        },
        formats: {
          values: models.Post.allowedFormats,
        },
      },
    },
    permissions: {
      unsafeAttrs: unsafeAttrs,
    },
    query(frame) {
      return postsService.readPost(frame);
    },
  },

  add: {
    statusCode: 201,
    headers: {
      cacheInvalidate: false,
    },
    options: ['include', 'formats', 'source'],
    validation: {
      options: {
        include: {
          values: allowedIncludes,
        },
        source: {
          values: ['html'],
        },
      },
    },
    permissions: {
      unsafeAttrs: unsafeAttrs,
    },
    async query(frame) {
      const model = await models.Post.add(frame.data.posts[0], frame.options);
      if (model.get('status') === 'published') {
        frame.setHeader('X-Cache-Invalidate', '/*');
      }

      return model;
    },
  },

  edit: {
    headers: {
      /** @type {boolean | {value: string}} */
      cacheInvalidate: false,
    },
    options: [
      'include',
      'id',
      'formats',
      'source',
      'email_segment',
      'newsletter',
      'force_rerender',
      'save_revision',
      'convert_to_lexical',
      // NOTE: only for internal context
      'forUpdate',
      'transacting',
    ],
    validation: {
      options: {
        include: {
          values: allowedIncludes,
        },
        id: {
          required: true,
        },
        source: {
          values: ['html'],
        },
      },
    },
    permissions: {
      unsafeAttrs: unsafeAttrs,
    },
    async query(frame) {
      const model = await postsService.editPost(frame, {
        eventHandler: (event, dto) => {
          const cacheInvalidate = getCacheHeaderFromEventString(event, dto);
          if (cacheInvalidate === true) {
            frame.setHeader('X-Cache-Invalidate', '/*');
          } else if (cacheInvalidate?.value) {
            frame.setHeader('X-Cache-Invalidate', cacheInvalidate.value);
          }
        },
      });

      return model;
    },
  },

  bulkEdit: {
    statusCode: 200,
    headers: {
      cacheInvalidate: true,
    },
    options: ['filter'],
    data: ['action', 'meta'],
    validation: {
      data: {
        action: {
          required: true,
        },
      },
      options: {
        filter: {
          required: true,
        },
      },
    },
    permissions: {
      method: 'edit',
    },
    async query(frame) {
      return await postsService.bulkEdit(frame.data.bulk, frame.options);
    },
  },

  bulkDestroy: {
    statusCode: 200,
    headers: {
      cacheInvalidate: true,
    },
    options: ['filter'],
    permissions: {
      method: 'destroy',
    },
    async query(frame) {
      const result = await postsService.bulkDestroy(frame.options);
      if (result.allDraft) {
        frame.setHeader('X-Cache-Invalidate', '');
      }

      return result;
    },
  },

  destroy: {
    statusCode: 204,
    headers: {
      cacheInvalidate: true,
    },
    options: ['include', 'id'],
    validation: {
      options: {
        include: {
          values: allowedIncludes,
        },
        id: {
          required: true,
        },
      },
    },
    permissions: {
      unsafeAttrs: unsafeAttrs,
    },
    async query(frame) {
      const post = await models.Post.findOne(
        {
          id: frame.options.id,
          status: 'all',
        },
        { require: false, columns: ['status'] },
      );

      if (post && post.get('status') === 'draft') {
        frame.setHeader('X-Cache-Invalidate', '');
      }

      return models.Post.destroy({ ...frame.options, require: true });
    },
  },

  copy: {
    statusCode: 201,
    headers: {
      location: {
        resolve: postsService.generateCopiedPostLocationFromUrl,
      },
      cacheInvalidate: false,
    },
    options: ['id', 'formats'],
    validation: {
      id: {
        required: true,
      },
    },
    permissions: {
      method: 'add',
    },
    async query(frame) {
      return postsService.copyPost(frame);
    },
  },
};

module.exports = controller;
