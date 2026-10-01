import * as metafields from '../../services/metafields';
import { metafieldDefinitionsController } from './utils/metafield-definitions';

// The API framework loads this file with `require()`, so it exports CommonJS-style;
// `export default` would not be picked up.
module.exports = metafieldDefinitionsController(
  { table: 'members', definitionResource: 'member_custom_field' },
  () => metafields.definitions!,
);
