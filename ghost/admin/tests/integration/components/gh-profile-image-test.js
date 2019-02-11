import Pretender from 'pretender';
import Service from '@ember/service';
import hbs from 'htmlbars-inline-precompile';
import md5 from 'blueimp-md5';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {find, render} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';
import {timeout} from 'ember-concurrency';

let pathsStub = Service.extend({
    assetRoot: '/ghost/assets/',

    init() {
        this._super(...arguments);

        this.url = {
            api() {
                return '';
            },
            asset(src) {
                return src;
            }
        };
    }
});

const stubKnownGravatar = function (server) {
    server.get('http://www.gravatar.com/avatar/:md5', function () {
        return [200, {'Content-Type': 'image/png'}, ''];
    });

    server.head('http://www.gravatar.com/avatar/:md5', function () {
        return [200, {'Content-Type': 'image/png'}, ''];
    });
};

const stubUnknownGravatar = function (server) {
    server.get('http://www.gravatar.com/avatar/:md5', function () {
        return [404, {}, ''];
    });

    server.head('http://www.gravatar.com/avatar/:md5', function () {
        return [404, {}, ''];
    });
};

let configStubuseGravatar = Service.extend({
    useGravatar: true
});

describe('Integration: Component: gh-profile-image', function () {
    setupRenderingTest();

    let server;

    beforeEach(function () {
        this.owner.register('service:ghost-paths', pathsStub);
        this.owner.register('service:config', configStubuseGravatar);

        server = new Pretender();
        stubKnownGravatar(server);
    });

    afterEach(function () {
        server.shutdown();
    });

    it('renders', async function () {
        this.set('email', '');

        await render(hbs`
            {{gh-profile-image email=email}}
        `);

        expect(find('.account-image')).to.exist;
        expect(find('.placeholder-img')).to.exist;
        expect(find('input[type="file"]')).to.exist;
    });

    it('renders default image if no email supplied', async function () {
        this.set('email', null);

        await render(hbs`
            {{gh-profile-image email=email size=100 debounce=50}}
        `);

        expect(
            find('.gravatar-img'),
            'gravatar image style'
        ).to.have.attribute('style', 'display: none');
    });

    it('renders the gravatar if valid email supplied and privacy.useGravatar allows it', async function () {
        let email = 'test@example.com';
        let expectedUrl = `//www.gravatar.com/avatar/${md5(email)}?s=100&d=404`;

        this.set('email', email);

        await render(hbs`
            {{gh-profile-image email=email size=100 debounce=50}}
        `);

        expect(
            find('.gravatar-img'),
            'gravatar image style'
        ).to.have.attribute('style', `background-image: url(${expectedUrl}); display: block`);
    });

    it('doesn\'t render the gravatar if valid email supplied but privacy.useGravatar forbids it', async function () {
        let config = this.owner.lookup('service:config');
        let email = 'test@example.com';

        this.set('email', email);
        config.set('useGravatar', false);

        await render(hbs`
            {{gh-profile-image email=email size=100 debounce=50}}
        `);

        expect(
            find('.gravatar-img'),
            'gravatar image style'
        ).to.have.attribute('style', 'display: none');
    });

    it('doesn\'t add background url if gravatar image doesn\'t exist', async function () {
        stubUnknownGravatar(server);

        await render(hbs`
            {{gh-profile-image email="test@example.com" size=100 debounce=50}}
        `);

        expect(
            find('.gravatar-img'),
            'gravatar image style'
        ).to.have.attribute('style', 'background-image: url(); display: none');
    });

    // skipped due to random failures on Travis - https://github.com/TryGhost/Ghost/issues/10308
    it.skip('throttles gravatar loading as email is changed', async function () {
        let email = 'test@example.com';
        let expectedUrl = `//www.gravatar.com/avatar/${md5(email)}?s=100&d=404`;

        this.set('email', 'test');

        await render(hbs`
            {{gh-profile-image email=email size=100 debounce=300}}
        `);

        this.set('email', email);

        await timeout(50);

        expect(
            find('.gravatar-img'),
            '.gravatar-img background not immediately changed on email change'
        ).to.have.attribute('style', 'display: none');

        await timeout(250);

        expect(
            find('.gravatar-img'),
            '.gravatar-img background still not changed before debounce timeout'
        ).to.have.attribute('style', 'display: none');

        await timeout(100);

        expect(
            find('.gravatar-img'),
            '.gravatar-img background changed after debounce timeout'
        ).to.have.attribute('style', `background-image: url(${expectedUrl}); display: block`);
    });
});
