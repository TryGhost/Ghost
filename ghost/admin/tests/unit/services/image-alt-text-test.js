import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: image-alt-text', function () {
    setupTest();

    it('posts an image URL and returns the generated alt text', async function () {
        const service = this.owner.lookup('service:image-alt-text');
        const post = sinon.stub().resolves({alt_text: 'A cyclist riding beside the sea.'});
        service.ajax = {post};
        service.ghostPaths = {
            url: {
                api: sinon.stub().withArgs('images', 'alt-text').returns('/ghost/api/admin/images/alt-text/')
            }
        };

        const result = await service.generate('/content/images/cyclist.png');

        expect(result).to.equal('A cyclist riding beside the sea.');
        expect(post.calledOnceWithExactly('/ghost/api/admin/images/alt-text/', {
            data: {
                image_url: '/content/images/cyclist.png'
            }
        })).to.be.true;
    });
});
