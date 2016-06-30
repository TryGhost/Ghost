/* jshint expr:true */
/* global md5 */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Service from 'ember-service';
import run from 'ember-runloop';
import Pretender from 'pretender';
import wait from 'ember-test-helpers/wait';

let pathsStub = Service.extend({
    url: {
        api() {
            return '';
        },
        asset(src) {
            return src;
        }
    }
});

const stubKnownGravatar = function (server) {
    server.get('http://www.gravatar.com/avatar/:md5', function () {
        return [200, {'Content-Type': 'image/png'}, ''];
    });
};

const stubUnknownGravatar = function (server) {
    server.get('http://www.gravatar.com/avatar/:md5', function () {
        return [404, {}, ''];
    });
};

describeComponent(
    'gh-profile-image',
    'Integration: Component: gh-profile-image',
    {
        integration: true
    },
    function () {
        let server;

        beforeEach(function () {
            this.register('service:ghost-paths', pathsStub);
            this.inject.service('ghost-paths', {as: 'ghost-paths'});

            server = new Pretender();
            stubKnownGravatar(server);
        });

        afterEach(function () {
            server.shutdown();
        });

        it('renders', function () {
            this.set('email', '');

            this.render(hbs`
                {{gh-profile-image email=email}}
            `);

            expect(this.$()).to.have.length(1);
        });

        it('renders and tears down ok with fileStorage:false', function () {
            this.set('fileStorage', false);

            this.render(hbs`
                {{gh-profile-image fileStorage=fileStorage}}
            `);

            expect(this.$()).to.have.length(1);
            expect(this.$('input')).to.have.length(0);
        }),

        it('renders default image if no email supplied', function () {
            this.set('email', null);

            this.render(hbs`
                {{gh-profile-image email=email size=100 debounce=50}}
            `);

            expect(this.$('.gravatar-img').attr('style'), 'gravatar image style')
                .to.be.blank;
        });

        it('renders the gravatar if valid email supplied', function (done) {
            let email = 'test@example.com';
            let expectedUrl = `//www.gravatar.com/avatar/${md5(email)}?s=100&d=404`;

            this.set('email', email);

            this.render(hbs`
                {{gh-profile-image email=email size=100 debounce=50}}
            `);

            // wait for the ajax request to complete
            wait().then(() => {
                expect(this.$('.gravatar-img').attr('style'), 'gravatar image style')
                    .to.equal(`background-image: url(${expectedUrl})`);
                done();
            });
        });

        it('doesn\'t add background url if gravatar image doesn\'t exist', function (done) {
            stubUnknownGravatar(server);

            this.render(hbs`
                {{gh-profile-image email="test@example.com" size=100 debounce=50}}
            `);

            wait().then(() => {
                expect(this.$('.gravatar-img').attr('style'), 'gravatar image style')
                    .to.be.blank;
                done();
            });
        });

        it('throttles gravatar loading as email is changed', function (done) {
            let email = 'test@example.com';
            let expectedUrl = `//www.gravatar.com/avatar/${md5(email)}?s=100&d=404`;

            this.set('email', 'test');

            this.render(hbs`
                {{gh-profile-image email=email size=100 debounce=300}}
            `);

            run(() => {
                this.set('email', email);
            });

            expect(this.$('.gravatar-img').attr('style'), '.gravatar-img background not immediately changed on email change')
                .to.be.blank;

            run.later(this, function () {
                expect(this.$('.gravatar-img').attr('style'), '.gravatar-img background still not changed before debounce timeout')
                    .to.be.blank;
            }, 250);

            run.later(this, function () {
                expect(this.$('.gravatar-img').attr('style'), '.gravatar-img background changed after debounce timeout')
                    .to.equal(`background-image: url(${expectedUrl})`);
                done();
            }, 400);
        });
    }
);
