import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';

describe('Unit: Component: gh-url-preview', function () {
    setupComponentTest('gh-url-preview', {
        unit: true,
        needs: ['service:config']
    });

    it('generates the correct preview URL with a prefix', function () {
        let component = this.subject({
            prefix: 'tag',
            slug: 'test-slug',
            tagName: 'p',
            classNames: 'test-class',

            config: {blogUrl: 'http://my-ghost-blog.com'}
        });

        this.render();

        expect(component.get('url')).to.equal('my-ghost-blog.com/tag/test-slug/');
    });

    it('generates the correct preview URL without a prefix', function () {
        let component = this.subject({
            slug: 'test-slug',
            tagName: 'p',
            classNames: 'test-class',

            config: {blogUrl: 'http://my-ghost-blog.com'}
        });

        this.render();

        expect(component.get('url')).to.equal('my-ghost-blog.com/test-slug/');
    });
});
