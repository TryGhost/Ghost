/* jshint expr:true */
/* global md5 */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Ember from 'ember';

const {run} = Ember;

let pathsStub = Ember.Service.extend({
    url: {
        api() {
            return '';
        },
        asset(src) {
            return src;
        }
    }
});

describeComponent(
    'gh-profile-image',
    'Integration: Component: gh-profile-image',
    {
        integration: true
    },
    function () {
        beforeEach(function () {
            this.register('service:ghost-paths', pathsStub);
            this.inject.service('ghost-paths', {as: 'ghost-paths'});
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

        it('immediately renders the gravatar if valid email supplied', function () {
            let email = 'test@example.com';
            let expectedUrl = `//www.gravatar.com/avatar/${md5(email)}?s=100&d=blank`;

            this.set('email', email);

            this.render(hbs`
                {{gh-profile-image email=email size=100 debounce=300}}
            `);

            expect(this.$('.gravatar-img').attr('style'), 'gravatar image style')
                .to.equal(`background-image: url(${expectedUrl})`);
        });

        it('throttles gravatar loading as email is changed', function (done) {
            let email = 'test@example.com';
            let expectedUrl = `//www.gravatar.com/avatar/${md5(email)}?s=100&d=blank`;

            this.set('email', 'test');

            this.render(hbs`
                {{gh-profile-image email=email size=100 debounce=300}}
            `);

            expect(this.$('.gravatar-img').length, '.gravatar-img not shown for invalid email')
                .to.equal(0);

            run(() => {
                this.set('email', email);
            });

            expect(this.$('.gravatar-img').length, '.gravatar-img not immediately changed on email change')
                .to.equal(0);

            Ember.run.later(this, function () {
                expect(this.$('.gravatar-img').length, '.gravatar-img still not shown before throttle timeout')
                    .to.equal(0);
            }, 250);

            Ember.run.later(this, function () {
                expect(this.$('.gravatar-img').attr('style'), '.gravatar-img style after timeout')
                    .to.equal(`background-image: url(${expectedUrl})`);
                done();
            }, 400);
        });
    }
);
