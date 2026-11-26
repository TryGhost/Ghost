/** The legacy oEmbed service: describes an external page from its address. */
import { forSiteWhenAsked } from './for-site';

type OembedService = {
  fetchOembedDataFromUrl(url: string, type: string, options?: object): Promise<any>;
};

export const oembedService = forSiteWhenAsked((): OembedService =>
  require('../../core/server/services/oembed'),
);
