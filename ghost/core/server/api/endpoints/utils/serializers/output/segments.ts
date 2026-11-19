import type { Frame } from '@tryghost/api-framework';
import { toSegmentsResponse } from '../../../../../services/segments/serializers';
import type { Segment } from '../../../../../services/segments/models';

const serializeOne = (segment: Segment, _apiConfig: unknown, frame: Frame): void => {
  frame.response = toSegmentsResponse.parse([segment]);
};

// module.exports (not export): the API framework loads serializers via require(). The endpoint ->
// serializer mapping lives here; the response shaping lives with the segments service.
module.exports = {
  browse(segments: Segment[], _apiConfig: unknown, frame: Frame): void {
    frame.response = toSegmentsResponse.parse(segments);
  },
  read: serializeOne,
  add: serializeOne,
  edit: serializeOne,
};
