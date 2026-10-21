import type { Frame } from '@tryghost/api-framework';
import { toAppSessionsResponse } from '../../../../../services/app-installations/serializers';
import type { AppSession } from '../../../../../services/app-installations';

// module.exports (not export): the API framework loads serializers via require().
module.exports = {
  start(session: AppSession, _apiConfig: unknown, frame: Frame): void {
    frame.response = toAppSessionsResponse.parse(session);
  },
};
