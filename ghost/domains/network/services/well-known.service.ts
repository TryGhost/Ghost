import { Recommendation } from '../entities/recommendation.entity';
import type { Site } from '#support/site';
import { urlUtils } from '../../../shared/transition/url-utils';

type UrlUtils = {
  relativeToAbsolute(url: string): string;
};
type Options = {
  urlUtils: UrlUtils;
};

export type WellknownRecommendation = {
  url: string;
  updated_at: string;
  created_at: string;
};

export class WellknownService {
  urlUtils: UrlUtils;

  constructor({ urlUtils }: Options) {
    this.urlUtils = urlUtils;
  }

  #formatRecommendation(recommendation: Recommendation): WellknownRecommendation {
    return {
      url: recommendation.url.toString(),
      updated_at: (recommendation.updatedAt ?? recommendation.createdAt).toISOString(),
      created_at: recommendation.createdAt.toISOString(),
    };
  }

  format(recommendations: Recommendation[]): WellknownRecommendation[] {
    return recommendations.map((r) => this.#formatRecommendation(r));
  }

  getURL(): URL {
    return new URL(this.urlUtils.relativeToAbsolute('/.well-known/recommendations.json'));
  }
}

export const wellKnown = (site: Site) => new WellknownService({ urlUtils: urlUtils(site) });
