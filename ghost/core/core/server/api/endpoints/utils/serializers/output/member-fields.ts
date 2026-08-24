import { toFieldsResponse } from '../../../../../services/members-custom-fields/serializers';
import type { CustomField } from '../../../../../services/members-custom-fields';

interface Frame {
  response?: unknown;
}

const serializeMany = (fields: CustomField[], _apiConfig: unknown, frame: Frame): void => {
  frame.response = toFieldsResponse.parse(fields);
};

// module.exports (not export): the API framework loads serializers via require(). Unlike
// the publisher's own endpoint, this shape carries the namespace that declared each field,
// because a key identifies one only inside its namespace.
module.exports = {
  browse: serializeMany,
};
