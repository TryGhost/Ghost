import EmberObject from '@ember/object';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {
    describe,
    it
} from 'mocha';
import {expect} from 'chai';

const Post = EmberObject.extend(ValidationEngine, {
    validationType: 'post',

    email: null
});

describe('Unit: Validator: post', function () {
    describe('canonicalUrl', function () {
        it('can be blank', async function () {
            const post = Post.create({canonicalUrl: ''});
            const passed = await post.validate({property: 'canonicalUrl'}).then(() => true);

            expect(passed, 'passed').to.be.true;
            expect(post.hasValidated).to.include('canonicalUrl');
        });

        it('can be an absolute URL', async function () {
            const post = Post.create({canonicalUrl: 'http://example.com'});
            const passed = await post.validate({property: 'canonicalUrl'}).then(() => true);

            expect(passed, 'passed').to.be.true;
            expect(post.hasValidated).to.include('canonicalUrl');
        });

        it('can be a relative URL', async function () {
            const post = Post.create({canonicalUrl: '/my-other-post'});
            const passed = await post.validate({property: 'canonicalUrl'}).then(() => true);

            expect(passed, 'passed').to.be.true;
            expect(post.hasValidated).to.include('canonicalUrl');
        });

        it('cannot be a random string', async function () {
            const post = Post.create({canonicalUrl: 'asdfghjk'});
            const passed = await post.validate({property: 'canonicalUrl'}).then(() => true).catch(() => false);

            expect(passed, 'passed').to.be.false;
            expect(post.hasValidated).to.include('canonicalUrl');

            const error = post.errors.errorsFor('canonicalUrl').get(0);
            expect(error.attribute).to.equal('canonicalUrl');
            expect(error.message).to.equal('Please enter a valid URL');
        });

        it('cannot be too long', async function () {
            const post = Post.create({canonicalUrl: `http://example.com/${(new Array(1983).join('x'))}`});
            const passed = await post.validate({property: 'canonicalUrl'}).then(() => true).catch(() => false);

            expect(passed, 'passed').to.be.false;
            expect(post.hasValidated).to.include('canonicalUrl');

            const error = post.errors.errorsFor('canonicalUrl').get(0);
            expect(error.attribute).to.equal('canonicalUrl');
            expect(error.message).to.equal('Canonical URL is too long, max 2000 chars');
        });
    });
});
