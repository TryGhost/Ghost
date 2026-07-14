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
            let post = Post.create({canonicalUrl: ''});
            let passed = await post.validate({property: 'canonicalUrl'}).then(() => true);

            expect(passed, 'passed').to.be.true;
            expect(post.hasValidated).to.include('canonicalUrl');
        });

        it('can be an absolute URL', async function () {
            let post = Post.create({canonicalUrl: 'http://example.com'});
            let passed = await post.validate({property: 'canonicalUrl'}).then(() => true);

            expect(passed, 'passed').to.be.true;
            expect(post.hasValidated).to.include('canonicalUrl');
        });

        it('can be a relative URL', async function () {
            let post = Post.create({canonicalUrl: '/my-other-post'});
            let passed = await post.validate({property: 'canonicalUrl'}).then(() => true);

            expect(passed, 'passed').to.be.true;
            expect(post.hasValidated).to.include('canonicalUrl');
        });

        it('cannot be a random string', async function () {
            let post = Post.create({canonicalUrl: 'asdfghjk'});
            let passed = await post.validate({property: 'canonicalUrl'}).then(() => true).catch(() => false);

            expect(passed, 'passed').to.be.false;
            expect(post.hasValidated).to.include('canonicalUrl');

            let error = post.errors.errorsFor('canonicalUrl').get(0);
            expect(error.attribute).to.equal('canonicalUrl');
            expect(error.message).to.equal('Please enter a valid URL');
        });

        it('cannot be too long', async function () {
            let post = Post.create({canonicalUrl: `http://example.com/${(new Array(1983).join('x'))}`});
            let passed = await post.validate({property: 'canonicalUrl'}).then(() => true).catch(() => false);

            expect(passed, 'passed').to.be.false;
            expect(post.hasValidated).to.include('canonicalUrl');

            let error = post.errors.errorsFor('canonicalUrl').get(0);
            expect(error.attribute).to.equal('canonicalUrl');
            expect(error.message).to.equal('Canonical URL is too long, max 2000 chars');
        });
    });

    describe('featureImageAlt', function () {
        it('accepts 2000 characters', async function () {
            let post = Post.create({featureImageAlt: 'a'.repeat(2000)});
            let passed = await post.validate({property: 'featureImageAlt'}).then(() => true).catch(() => false);

            expect(passed, 'passed').to.be.true;
        });

        it('rejects more than 2000 characters', async function () {
            let post = Post.create({featureImageAlt: 'a'.repeat(2001)});
            let passed = await post.validate({property: 'featureImageAlt'}).then(() => true).catch(() => false);

            expect(passed, 'passed').to.be.false;
            expect(post.errors.errorsFor('featureImageAlt').get(0).message).to.equal('Feature image alt text cannot be longer than 2000 characters.');
        });
    });
});
