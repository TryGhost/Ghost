import { Recommendation } from './recommendation';

type UrlUtils = {
  relativeToAbsolute(url: string): string;
};
type Options = {
  urlUtils: UrlUtils;
};

export class WellknownService {
  urlUtils: UrlUtils;

  constructor({ urlUtils }: Options) {
    this.urlUtils = urlUtils;
  }

  #formatRecommendation(recommendation: Recommendation) {
    return {
      url: recommendation.url,
      updated_at: (recommendation.updatedAt ?? recommendation.createdAt).toISOString(),
      created_at: recommendation.createdAt.toISOString(),
    };
  }

  serialize(recommendations: Recommendation[]): string {
    return JSON.stringify(recommendations.map((r) => this.#formatRecommendation(r)));
  }

  getURL(): URL {
    return new URL(this.urlUtils.relativeToAbsolute('/.well-known/recommendations.json'));
  }
}
