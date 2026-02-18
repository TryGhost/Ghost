const assert = require('node:assert/strict');
const {checks} = require('../../../../../core/frontend/services/data');

describe('Checks', function () {
    it('methods', function () {
        assert.deepEqual(Object.keys(checks), [
            'isPost',
            'isNewsletter',
            'isPage',
            'isTag',
            'isUser',
            'isNav'
        ]);
    });
    it('isPost', function () {
        assert.equal(checks.isPost({}), false);
        assert.equal(checks.isPost({title: 'Test'}), false);
        assert.equal(checks.isPost({title: 'Test', slug: 'test'}), false);
        assert.equal(checks.isPost({title: 'Test', slug: 'test', html: ''}), true);
    });

    it('isPage', function () {
        assert.equal(checks.isPage(undefined), false);
        assert.equal(checks.isPage({}), false);
        assert.equal(checks.isPage({title: 'Test'}), false);
        assert.equal(checks.isPage({title: 'Test', show_title_and_feature_image: false}), true);
        assert.equal(checks.isPage({title: 'Test', show_title_and_feature_image: true}), true);
    });

    it('isNewsletter', function () {
        assert.equal(checks.isNewsletter({}), false);
        assert.equal(checks.isNewsletter({name: 'Test'}), false);
        assert.equal(checks.isNewsletter({name: 'Test', visibility: 'members', subscribe_on_signup: true}), true);
        assert.equal(checks.isNewsletter({name: 'Test', visibility: 'paid', subscribe_on_signup: false}), true);
    });

    it('isTag', function () {
        assert.equal(checks.isTag({}), false);
        assert.equal(checks.isTag({name: 'Test'}), false);
        assert.equal(checks.isTag({name: 'Test', slug: 'test'}), false);
        assert.equal(checks.isTag({name: 'Test', slug: 'test', description: ''}), false);
        assert.equal(checks.isTag({name: 'Test', slug: 'test', description: '', feature_image: ''}), true);
    });

    it('isUser', function () {
        assert.equal(checks.isUser({}), false);
        assert.equal(checks.isUser({bio: 'Test'}), false);
        assert.equal(checks.isUser({bio: 'Test', website: 'test'}), false);
        assert.equal(checks.isUser({bio: 'Test', website: 'test', profile_image: ''}), false);
        assert.equal(checks.isUser({bio: 'Test', website: 'test', profile_image: '', location: ''}), true);
    });

    it('isNav', function () {
        assert.equal(checks.isNav({}), false);
        assert.equal(checks.isNav({label: 'Test'}), false);
        assert.equal(checks.isNav({label: 'Test', slug: 'test'}), false);
        assert.equal(checks.isNav({label: 'Test', slug: 'test', url: ''}), false);
        assert.equal(checks.isNav({label: 'Test', slug: 'test', url: '', current: false}), true);
    });
});
