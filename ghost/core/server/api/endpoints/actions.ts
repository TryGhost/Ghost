import type { Frame } from '@tryghost/api-framework';
import actionLog from '../../services/action-log';
import { BrowseActionsRequest } from '../../services/action-log/serializers';
import { restrictAdminApiQueryOptions } from './utils/api-filter-utils';

const controller = {
  docName: 'actions',

  browse: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['page', 'limit', 'fields', 'include', 'filter'],
    permissions: true,
    query(frame: Frame) {
      // The fields asked for are picked when the response is built, so the service always reads
      // whole actions.
      const { page, limit, filter, withRelated, context } = BrowseActionsRequest.parse(
        frame.options,
      );
      return actionLog.service.browse(
        restrictAdminApiQueryOptions({ page, limit, filter, withRelated, context }),
      );
    },
  },
};

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
