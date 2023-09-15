const should = require('should');
const {checks} = require('../../../../../core/frontend/services/data');

describe('Checks', function () {
    it('methods', function () {
        Object.keys(checks).should.eql([
            'isPost',
            'isNewsletter',
            'isPage',
            'isTag',
            'isUser',
            'isNav'
        ]);
    });
    it('isPost', function () {
        checks.isPost({}).should.eql(false);
        checks.isPost({title: 'Test'}).should.eql(false);
        checks.isPost({title: 'Test', slug: 'test'}).should.eql(false);
        checks.isPost({title: 'Test', slug: 'test', html: ''}).should.eql(true);
    });

    it('isPage', function () {
        checks.isPage(undefined).should.eql(false);
        checks.isPage({}).should.eql(false);
        checks.isPage({title: 'Test'}).should.eql(false);
        checks.isPage({title: 'Test', show_title_and_feature_image: false}).should.eql(true);
        checks.isPage({title: 'Test', show_title_and_feature_image: true}).should.eql(true);
    });

    it('isNewsletter', function () {
        checks.isNewsletter({}).should.eql(false);
        checks.isNewsletter({name: 'Test'}).should.eql(false);
        checks.isNewsletter({name: 'Test', visibility: 'members', subscribe_on_signup: true}).should.eql(true);
        checks.isNewsletter({name: 'Test', visibility: 'paid', subscribe_on_signup: false}).should.eql(true);
    });

    it('isTag', function () {
        checks.isTag({}).should.eql(false);
        checks.isTag({name: 'Test'}).should.eql(false);
        checks.isTag({name: 'Test', slug: 'test'}).should.eql(false);
        checks.isTag({name: 'Test', slug: 'test', description: ''}).should.eql(false);
        checks.isTag({name: 'Test', slug: 'test', description: '', feature_image: ''}).should.eql(true);
    });

    it('isUser', function () {
        checks.isUser({}).should.eql(false);
        checks.isUser({bio: 'Test'}).should.eql(false);
        checks.isUser({bio: 'Test', website: 'test'}).should.eql(false);
        checks.isUser({bio: 'Test', website: 'test', profile_image: ''}).should.eql(false);
        checks.isUser({bio: 'Test', website: 'test', profile_image: '', location: ''}).should.eql(true);
    });

    it('isNav', function () {
        checks.isNav({}).should.eql(false);
        checks.isNav({label: 'Test'}).should.eql(false);
        checks.isNav({label: 'Test', slug: 'test'}).should.eql(false);
        checks.isNav({label: 'Test', slug: 'test', url: ''}).should.eql(false);
        checks.isNav({label: 'Test', slug: 'test', url: '', current: false}).should.eql(true);
    });
});
