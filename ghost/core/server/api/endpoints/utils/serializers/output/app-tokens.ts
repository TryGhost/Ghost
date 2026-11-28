import type { Frame } from '@tryghost/api-framework';
import { toAppTokensResponse } from '../../../../../services/app-installations/serializers';
import type { AppSessionToken } from '../../../../../services/app-installations';

// module.exports (not export): the API framework loads serializers via require().
module.exports = {
  add(token: AppSessionToken, _apiConfig: unknown, frame: Frame): void {
    frame.response = toAppTokensResponse.parse(token);
  },
};
