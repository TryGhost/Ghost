import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: ai', function () {
    setupTest();

    it('posts an image URL and returns the generated alt text', async function () {
        const service = this.owner.lookup('service:ai');
        const post = sinon.stub().resolves({alt_text: 'A cyclist riding beside the sea.'});
        service.ajax = {post};
        service.ghostPaths = {
            url: {
                api: sinon.stub().withArgs('ai', 'alt-text').returns('/ghost/api/admin/ai/alt-text/')
            }
        };

        const result = await service.generateImageAltText('/content/images/cyclist.png');

        expect(result).to.equal('A cyclist riding beside the sea.');
        expect(post.calledOnceWithExactly('/ghost/api/admin/ai/alt-text/', {
            data: {
                image_url: '/content/images/cyclist.png'
            }
        })).to.be.true;
    });
});
