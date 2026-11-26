/** The legacy mentions service: webmentions sent and received. It is ready once boot has started it. */
import type mentionsRoot from '../../core/server/services/mentions';
import { forSiteWhenAsked } from './for-site';

export const mentions = forSiteWhenAsked(
  (): typeof mentionsRoot.service => require('../../core/server/services/mentions').default.service,
);
