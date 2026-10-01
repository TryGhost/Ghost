import { toMetafieldsResponse } from '../../../../../services/metafields/serializers';
import type { Metafield } from '../../../../../services/metafields';

// Definitions for any kind of record: the response is keyed by the resource the request was for.
interface ApiConfig {
  docName: string;
}

interface Frame {
  response?: unknown;
}

const serializeOne = (field: Metafield, apiConfig: ApiConfig, frame: Frame): void => {
  frame.response = toMetafieldsResponse(apiConfig.docName, [field]);
};

const serializeMany = (fields: Metafield[], apiConfig: ApiConfig, frame: Frame): void => {
  frame.response = toMetafieldsResponse(apiConfig.docName, fields);
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
