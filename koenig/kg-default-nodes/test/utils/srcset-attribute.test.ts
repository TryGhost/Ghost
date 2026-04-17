import should from 'should';
import {getSrcsetAttribute} from '../../src/utils/srcset-attribute.js';

describe('srcsetAttribute', function () {
    it('returns undefined when a local image path does not match the content/images capture pattern', function () {
        const result = getSrcsetAttribute({
            src: '/xcontent/images/2024/04/example.jpg',
            width: 1200,
            options: {
                imageOptimization: {
                    contentImageSizes: {
                        s: {width: 600},
                        m: {width: 1000},
                        l: {width: 1600}
                    }
                }
            }
        });

        should(result).be.undefined();
    });
});
