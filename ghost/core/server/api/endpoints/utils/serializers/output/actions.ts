import type { Frame } from '@tryghost/api-framework';
import {
  type ActionsPage,
  BrowseActionsRequest,
  toActionsResponse,
} from '../../../../../services/action-log/serializers';

// module.exports (not export): the API framework loads serializers via require(). The response
// shaping lives with the action log service.
module.exports = {
  browse(page: ActionsPage, _apiConfig: unknown, frame: Frame): void {
    frame.response = toActionsResponse(page, BrowseActionsRequest.parse(frame.options).columns);
  },
};
