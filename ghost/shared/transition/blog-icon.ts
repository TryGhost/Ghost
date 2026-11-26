/** The legacy site icon helper. It reads the icon from one site's settings. */
import { forSite } from './for-site';

const legacy: { getIconUrl(options: { absolute: boolean }): string } =
  require('../../core/server/lib/image').blogIcon;

export const blogIcon = forSite(legacy);
