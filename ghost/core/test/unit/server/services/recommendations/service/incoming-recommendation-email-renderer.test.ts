import assert from 'assert/strict';
import {IncomingRecommendationEmailRenderer} from '../../../../../../core/server/services/recommendations/service';

describe('IncomingRecommendationEmailRenderer', function () {
    it('passes all calls', async function () {
        const service = new IncomingRecommendationEmailRenderer({
            staffService: {
                api: {
                    emails: {
                        renderHTML: async () => 'html',
                        renderText: async () => 'text'
                    }
                }
            }
        });
        assert.equal(await service.renderSubject({
            title: 'title',
            siteTitle: 'title'
        } as any), '👍 New recommendation: title');

        assert.equal(await service.renderHTML({} as any, {} as any), 'html');
        assert.equal(await service.renderText({} as any, {} as any), 'text');
    });
});
