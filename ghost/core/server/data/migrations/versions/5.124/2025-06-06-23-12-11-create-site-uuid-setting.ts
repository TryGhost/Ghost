/**
 * This migration creates a new setting for the site UUID.
 * It will use the `site_uuid` configuration key if it is provided and is a valid UUID.
 * Otherwise, it will generate a new random UUID.
 */

import { addSetting } from '../../utils';
import { getOrGenerateSiteUuid } from '../../../../services/settings/settings-utils';

export default addSetting({
  key: 'site_uuid',
  value: getOrGenerateSiteUuid(),
  type: 'string',
  group: 'core',
  flags: 'PUBLIC,RO',
});
