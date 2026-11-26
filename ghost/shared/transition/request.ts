/** The HTTP client for requests to addresses Ghost or its host supplies. It keeps connections open, so it is asked for, not imported. */
import legacy from '@tryghost/request';
import { forSite } from './for-site';

export const request = forSite(legacy);
