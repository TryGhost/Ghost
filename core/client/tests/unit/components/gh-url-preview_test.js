import {
    describeComponent,
    it
} from 'ember-mocha';

describeComponent(
    'gh-url-preview',
    'Unit: Component: gh-url-preview',
    {
        unit: true
    },
    function () {
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
    }
);
