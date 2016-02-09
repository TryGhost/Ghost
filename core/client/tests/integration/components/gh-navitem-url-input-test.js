/* jshint scripturl:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Ember from 'ember';

const {run} = Ember;

// we want baseUrl to match the running domain so relative URLs are
// handled as expected (browser auto-sets the domain when using a.href)
let currentUrl = `${window.location.protocol}//${window.location.host}/`;

describeComponent(
    'gh-navitem-url-input',
    'Integration: Component: gh-navitem-url-input', {
        integration: true
    },
    function () {
        beforeEach(function () {
            // set defaults
            this.set('baseUrl', currentUrl);
            this.set('url', '');
            this.set('isNew', false);
            this.on('clearErrors', function () {
                return null;
            });
        });

        it('renders correctly with blank url', function () {
            this.render(hbs`
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
            `);
            let $input = this.$('input');

            expect($input).to.have.length(1);
            expect($input.hasClass('gh-input')).to.be.true;
            expect($input.val()).to.equal(currentUrl);
        });

        it('renders correctly with relative urls', function () {
            this.set('url', '/about');
            this.render(hbs`
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
            `);
            let $input = this.$('input');

            expect($input.val()).to.equal(`${currentUrl}about`);

            this.set('url', '/about#contact');
            expect($input.val()).to.equal(`${currentUrl}about#contact`);
        });

        it('renders correctly with absolute urls', function () {
            this.set('url', 'https://example.com:2368/#test');
            this.render(hbs`
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
            `);
            let $input = this.$('input');

            expect($input.val()).to.equal('https://example.com:2368/#test');

            this.set('url', 'mailto:test@example.com');
            expect($input.val()).to.equal('mailto:test@example.com');

            this.set('url', 'tel:01234-5678-90');
            expect($input.val()).to.equal('tel:01234-5678-90');

            this.set('url', '//protocol-less-url.com');
            expect($input.val()).to.equal('//protocol-less-url.com');

            this.set('url', '#anchor');
            expect($input.val()).to.equal('#anchor');
        });

        it('deletes base URL on backspace', function () {
            this.render(hbs`
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
            `);
            let $input = this.$('input');

            expect($input.val()).to.equal(currentUrl);
            run(() => {
                // TODO: why is ember's keyEvent helper not available here?
                let e = Ember.$.Event('keydown');
                e.keyCode = 8;
                $input.trigger(e);
            });
            expect($input.val()).to.equal('');
        });

        it('deletes base URL on delete', function () {
            this.render(hbs`
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
            `);
            let $input = this.$('input');

            expect($input.val()).to.equal(currentUrl);
            run(() => {
                // TODO: why is ember's keyEvent helper not available here?
                let e = Ember.$.Event('keydown');
                e.keyCode = 46;
                $input.trigger(e);
            });
            expect($input.val()).to.equal('');
        });

        it('adds base url to relative urls on blur', function () {
            this.on('updateUrl', () => {
                return null;
            });
            this.render(hbs`
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
            `);
            let $input = this.$('input');

            run(() => {
                $input.val('/about').trigger('input');
            });
            run(() => {
                $input.trigger('blur');
            });

            expect($input.val()).to.equal(`${currentUrl}about`);
        });

        it('adds "mailto:" to email addresses on blur', function () {
            this.on('updateUrl', () => {
                return null;
            });
            this.render(hbs`
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
            `);
            let $input = this.$('input');

            run(() => {
                $input.val('test@example.com').trigger('input');
            });
            run(() => {
                $input.trigger('blur');
            });

            expect($input.val()).to.equal('mailto:test@example.com');

            // ensure we don't double-up on the mailto:
            run(() => {
                $input.trigger('blur');
            });
            expect($input.val()).to.equal('mailto:test@example.com');
        });

        it('doesn\'t add base url to invalid urls on blur', function () {
            this.on('updateUrl', () => {
                return null;
            });
            this.render(hbs`
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
            `);
            let $input = this.$('input');

            let changeValue = function (value) {
                run(() => {
                    $input.val(value).trigger('input').trigger('blur');
                });
            };

            changeValue('with spaces');
            expect($input.val()).to.equal('with spaces');

            changeValue('/with spaces');
            expect($input.val()).to.equal('/with spaces');
        });

        it('doesn\'t mangle invalid urls on blur', function () {
            this.on('updateUrl', () => {
                return null;
            });
            this.render(hbs`
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
            `);
            let $input = this.$('input');

            run(() => {
                $input.val(`${currentUrl} /test`).trigger('input').trigger('blur');
            });

            expect($input.val()).to.equal(`${currentUrl} /test`);
        });

        it('toggles .fake-placeholder on focus', function () {
            this.set('isNew', true);
            this.render(hbs `
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
            `);
            let $input = this.$('input');

            expect($input.hasClass('fake-placeholder')).to.be.true;

            run(() => {
                $input.trigger('focus');
            });
            expect($input.hasClass('fake-placeholder')).to.be.false;
        });

        it('triggers "change" action on blur', function () {
            let changeActionCallCount = 0;
            this.on('updateUrl', () => {
                changeActionCallCount++;
            });

            this.render(hbs `
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
            `);
            let $input = this.$('input');

            $input.trigger('blur');

            expect(changeActionCallCount).to.equal(1);
        });

        it('triggers "change" action on enter', function () {
            let changeActionCallCount = 0;
            this.on('updateUrl', () => {
                changeActionCallCount++;
            });

            this.render(hbs `
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
            `);
            let $input = this.$('input');

            run(() => {
                // TODO: why is ember's keyEvent helper not available here?
                let e = Ember.$.Event('keypress');
                e.keyCode = 13;
                $input.trigger(e);
            });

            expect(changeActionCallCount).to.equal(1);
        });

        it('triggers "change" action on CMD-S', function () {
            let changeActionCallCount = 0;
            this.on('updateUrl', () => {
                changeActionCallCount++;
            });

            this.render(hbs `
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
            `);
            let $input = this.$('input');

            run(() => {
                // TODO: why is ember's keyEvent helper not available here?
                let e = Ember.$.Event('keydown');
                e.keyCode = 83;
                e.metaKey = true;
                $input.trigger(e);
            });

            expect(changeActionCallCount).to.equal(1);
        });

        it('sends absolute urls straight through to change action', function () {
            let expectedUrl = '';

            this.on('updateUrl', (url) => {
                expect(url).to.equal(expectedUrl);
            });

            this.render(hbs `
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
            `);
            let $input = this.$('input');

            let testUrl = (url) => {
                expectedUrl = url;
                run(() => {
                    $input.val(url).trigger('input');
                });
                run(() => {
                    $input.trigger('blur');
                });
            };

            testUrl('http://example.com');
            testUrl('http://example.com/');
            testUrl('https://example.com');
            testUrl('//example.com');
            testUrl('//localhost:1234');
            testUrl('#anchor');
            testUrl('mailto:test@example.com');
            testUrl('tel:12345-567890');
            testUrl('javascript:alert("testing");');
        });

        it('strips base url from relative urls before sending to change action', function () {
            let expectedUrl = '';

            this.on('updateUrl', (url) => {
                expect(url).to.equal(expectedUrl);
            });

            this.render(hbs `
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
            `);
            let $input = this.$('input');

            let testUrl = (url) => {
                expectedUrl = `/${url}`;
                run(() => {
                    $input.val(`${currentUrl}${url}`).trigger('input');
                });
                run(() => {
                    $input.trigger('blur');
                });
            };

            testUrl('about/');
            testUrl('about#contact');
            testUrl('test/nested/');
        });

        it('handles links to subdomains of blog domain', function () {
            let expectedUrl = '';

            this.set('baseUrl', 'http://example.com/');

            this.on('updateUrl', (url) => {
                expect(url).to.equal(expectedUrl);
            });

            this.render(hbs `
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
            `);
            let $input = this.$('input');

            expectedUrl = 'http://test.example.com/';
            run(() => {
                $input.val(expectedUrl).trigger('input').trigger('blur');
            });
            expect($input.val()).to.equal(expectedUrl);
        });

        it('adds trailing slash to relative URL', function () {
            let expectedUrl = '';

            this.on('updateUrl', (url) => {
                expect(url).to.equal(expectedUrl);
            });

            this.render(hbs `
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
            `);
            let $input = this.$('input');

            let testUrl = (url) => {
                expectedUrl = `/${url}/`;
                run(() => {
                    $input.val(`${currentUrl}${url}`).trigger('input');
                });
                run(() => {
                    $input.trigger('blur');
                });
            };

            testUrl('about');
            testUrl('test/nested');
        });

        it('does not add trailing slash on relative URL with [.?#]', function () {
            let expectedUrl = '';

            this.on('updateUrl', (url) => {
                expect(url).to.equal(expectedUrl);
            });

            this.render(hbs `
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
            `);
            let $input = this.$('input');

            let testUrl = (url) => {
                expectedUrl = `/${url}`;
                run(() => {
                    $input.val(`${currentUrl}${url}`).trigger('input');
                });
                run(() => {
                    $input.trigger('blur');
                });
            };

            testUrl('about#contact');
            testUrl('test/nested.svg');
            testUrl('test?gho=sties');
            testUrl('test/nested?sli=mer');
        });

        it('does not add trailing slash on non-relative URLs', function () {
            let expectedUrl = '';

            this.on('updateUrl', (url) => {
                expect(url).to.equal(expectedUrl);
            });

            this.render(hbs `
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
            `);
            let $input = this.$('input');

            let testUrl = (url) => {
                expectedUrl = `/${url}`;
                run(() => {
                    $input.val(`${currentUrl}${url}`).trigger('input');
                });
                run(() => {
                    $input.trigger('blur');
                });
            };

            testUrl('http://woo.ff/test');
            testUrl('http://me.ow:2342/nested/test');
            testUrl('https://wro.om/car#race');
            testUrl('https://kabo.om/explosion?really=now');
        });

        describe('with sub-folder baseUrl', function () {
            beforeEach(function () {
                this.set('baseUrl', `${currentUrl}blog/`);
            });

            it('handles URLs relative to base url', function () {
                let expectedUrl = '';

                this.on('updateUrl', (url) => {
                    expect(url).to.equal(expectedUrl);
                });

                this.render(hbs `
                    {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
                `);
                let $input = this.$('input');

                let testUrl = (url) => {
                    expectedUrl = url;
                    run(() => {
                        $input.val(`${currentUrl}blog${url}`).trigger('input');
                    });
                    run(() => {
                        $input.trigger('blur');
                    });
                };

                testUrl('/about/');
                testUrl('/about#contact');
                testUrl('/test/nested/');
            });

            it('handles URLs relative to base host', function () {
                let expectedUrl = '';

                this.on('updateUrl', (url) => {
                    expect(url).to.equal(expectedUrl);
                });

                this.render(hbs `
                    {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew change="updateUrl" clearErrors=(action "clearErrors")}}
                `);
                let $input = this.$('input');

                let testUrl = (url) => {
                    expectedUrl = url;
                    run(() => {
                        $input.val(url).trigger('input');
                    });
                    run(() => {
                        $input.trigger('blur');
                    });
                };

                testUrl(`http://${window.location.host}`);
                testUrl(`https://${window.location.host}`);
                testUrl(`http://${window.location.host}/`);
                testUrl(`https://${window.location.host}/`);
                testUrl(`http://${window.location.host}/test`);
                testUrl(`https://${window.location.host}/test`);
                testUrl(`http://${window.location.host}/#test`);
                testUrl(`https://${window.location.host}/#test`);
                testUrl(`http://${window.location.host}/another/folder`);
                testUrl(`https://${window.location.host}/another/folder`);
            });
        });
    }
);
