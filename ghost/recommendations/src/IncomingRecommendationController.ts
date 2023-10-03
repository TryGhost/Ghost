import {IncomingRecommendationService} from './IncomingRecommendationService';
import {IncomingRecommendation} from './IncomingRecommendation';

export class IncomingRecommendationController {
    service: IncomingRecommendationService;

    constructor(deps: {service: IncomingRecommendationService}) {
        this.service = deps.service;
    }

    async browse() {
        const recommendations = await this.service.listIncomingRecommendations();

        return this.#serialize(
            recommendations
        );
    }

    #serialize(recommendations: IncomingRecommendation[], meta?: any) {
        return {
            data: recommendations.map((entity) => {
                return {
                    id: entity.id,
                    title: entity.title,
                    excerpt: entity.excerpt,
                    featured_image: entity.featuredImage?.toString() ?? null,
                    favicon: entity.favicon?.toString() ?? null,
                    url: entity.url.toString()
                };
            }),
            meta
        };
    }
}
