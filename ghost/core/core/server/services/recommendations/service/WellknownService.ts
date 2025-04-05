import {Recommendation} from './Recommendation';
import fs from 'fs/promises';
import _path from 'path';

type UrlUtils = {
    relativeToAbsolute(url: string): string
}
type Options = {
    /**
     * Where to publish the wellknown file
     */
    dir: string,
    urlUtils: UrlUtils
}

export class WellknownService {
    dir: string;
    urlUtils: UrlUtils;

    constructor({dir, urlUtils}: Options) {
        this.dir = dir;
        this.urlUtils = urlUtils;
    }

    #formatRecommendation(recommendation: Recommendation) {
        return {
            url: recommendation.url,
            updated_at: (recommendation.updatedAt ?? recommendation.createdAt).toISOString(),
            created_at: (recommendation.createdAt).toISOString()
        };
    }

    getPath() {
        return _path.join(this.dir, '/.well-known/recommendations.json');
    }

    getURL(): URL {
        return new URL(this.urlUtils.relativeToAbsolute('/.well-known/recommendations.json'));
    }

    async set(recommendations: Recommendation[]) {
        const content = JSON.stringify(recommendations.map(r => this.#formatRecommendation(r)));
        const path = this.getPath();
        await fs.mkdir(_path.dirname(path), {recursive: true});
        await fs.writeFile(path, content);
    }
}
