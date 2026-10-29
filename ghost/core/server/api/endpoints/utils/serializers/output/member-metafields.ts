import type { Frame } from '@tryghost/api-framework';
import { HeldOptionsResponseSchema } from '@tryghost/metafield-types';
import { toMetafieldsResponse } from '../../../../../services/members-metafields/serializers';
import type { Metafield } from '../../../../../services/members-metafields';

const serializeOne = (field: Metafield, _apiConfig: unknown, frame: Frame): void => {
  frame.response = toMetafieldsResponse.parse([field]);
};

const serializeMany = (fields: Metafield[], _apiConfig: unknown, frame: Frame): void => {
  frame.response = toMetafieldsResponse.parse(fields);
};

const serializeHeldOptions = (options: string[], _apiConfig: unknown, frame: Frame): void => {
  frame.response = HeldOptionsResponseSchema.parse({ held_options: options });
};

// The API framework loads this file with `require()`, so it exports CommonJS-style;
// `export default` would not be picked up.
module.exports = {
  browse: serializeMany,
  heldOptions: serializeHeldOptions,
  read: serializeOne,
  add: serializeMany,
  reorder: serializeMany,
  edit: serializeOne,
};
