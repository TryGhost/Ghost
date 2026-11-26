/** The legacy URL utilities, built from one site's configured URL. */
import legacy from '../../core/shared/url-utils';
import { forSite } from './for-site';

export const urlUtils = forSite(legacy);
