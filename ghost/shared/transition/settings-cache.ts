/** The legacy settings cache: one site's settings, held in memory. */
import legacy from '../../core/shared/settings-cache';
import { forSite } from './for-site';

export const settingsCache = forSite(legacy);
