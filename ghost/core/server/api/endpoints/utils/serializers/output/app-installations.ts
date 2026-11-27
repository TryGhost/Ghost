import type { Frame } from '@tryghost/api-framework';
import { toAppInstallationsResponse } from '../../../../../services/app-installations/serializers';
import type {
  Installation,
  InstallationWithHistory,
} from '../../../../../services/app-installations';

const serializeOne = (
  installation: InstallationWithHistory,
  _apiConfig: unknown,
  frame: Frame,
): void => {
  frame.response = toAppInstallationsResponse.parse([installation]);
};

// module.exports (not export): the API framework loads serializers via require(). The endpoint ->
// serializer mapping lives here; the response shaping lives with the app installations service.
module.exports = {
  browse(installations: Installation[], _apiConfig: unknown, frame: Frame): void {
    frame.response = toAppInstallationsResponse.parse(installations);
  },
  read: serializeOne,
  add: serializeOne,
  edit: serializeOne,
};
