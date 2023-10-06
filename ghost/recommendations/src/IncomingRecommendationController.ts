import {IncomingRecommendationService} from './IncomingRecommendationService';
import {IncomingRecommendation} from './IncomingRecommendationService';
import {UnsafeData} from './UnsafeData';

type Frame = {
    data: unknown,
    options: unknown,
};

type Meta = {
    pagination: object,
}

export class IncomingRecommendationController {
    service: IncomingRecommendationService;

    constructor(deps: {service: IncomingRecommendationService}) {
        this.service = deps.service;
    }

    async browse(frame: Frame) {
        const options = new UnsafeData(frame.options);

        const page = options.optionalKey('page')?.integer ?? 1;
        const limit = options.optionalKey('limit')?.integer ?? 5;

        const {incomingRecommendations, meta} = await this.service.listIncomingRecommendations({page, limit});

        return this.#serialize(
            incomingRecommendations,
            meta
        );
    }

    #serialize(recommendations: IncomingRecommendation[], meta?: Meta) {
        return {
            data: recommendations.map((entity) => {
                return {
                    id: entity.id,
                    title: entity.title,
                    excerpt: entity.excerpt,
                    featured_image: entity.featuredImage?.toString() ?? null,
                    favicon: entity.favicon?.toString() ?? null,
                    url: entity.url.toString(),
                    recommending_back: !!entity.recommendingBack
                };
            }),
            meta
        };
    }
}
