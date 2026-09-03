import { toCustomFieldsResponse } from '../../../../../services/members-custom-fields/serializers';
import type { CustomField } from '../../../../../services/members-custom-fields';

interface Frame {
  response?: unknown;
}

const serializeOne = (field: CustomField, _apiConfig: unknown, frame: Frame): void => {
  frame.response = toCustomFieldsResponse.parse([field]);
};

const serializeMany = (fields: CustomField[], _apiConfig: unknown, frame: Frame): void => {
  frame.response = toCustomFieldsResponse.parse(fields);
};

// The API framework loads this file with `require()`, so it exports CommonJS-style;
// `export default` would not be picked up.
module.exports = {
  browse: serializeMany,
  read: serializeOne,
  add: serializeMany,
  reorder: serializeMany,
  edit: serializeOne,
};
