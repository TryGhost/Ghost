import { toMetafieldsResponse } from '../../../../../services/members-metafields/serializers';
import type { Metafield } from '../../../../../services/members-metafields';

interface Frame {
  response?: unknown;
}

const serializeOne = (field: Metafield, _apiConfig: unknown, frame: Frame): void => {
  frame.response = toMetafieldsResponse.parse([field]);
};

const serializeMany = (fields: Metafield[], _apiConfig: unknown, frame: Frame): void => {
  frame.response = toMetafieldsResponse.parse(fields);
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
