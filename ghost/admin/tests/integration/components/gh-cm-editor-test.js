import $ from 'jquery';
import hbs from 'htmlbars-inline-precompile';
import wait from 'ember-test-helpers/wait';
import {click, find, triggerEvent} from 'ember-native-dom-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

// NOTE: If the browser window is not focused/visible CodeMirror (or Chrome?) will
// take longer to respond to/fire events so it's possible that some of these tests
// will take 1-3 seconds

describe('Integration: Component: gh-cm-editor', function () {
    setupComponentTest('gh-cm-editor', {
        integration: true
    });

    it('handles change event', function () {
        this.set('text', '');

        this.render(hbs`{{gh-cm-editor text class="gh-input" update=(action (mut text))}}`);
        // access CodeMirror directly as it doesn't pick up changes to the textarea
        let cm = find('.gh-input .CodeMirror').CodeMirror;
        cm.setValue('Testing');

        return wait().then(() => {
            expect(this.get('text'), 'text value after CM editor change')
                .to.equal('Testing');
        });
    });

    it('handles focus event', function (done) {
        // CodeMirror's events are triggered outside of anything we can watch for
        // in the tests so let's run the class check when we know the event has
        // been fired and timeout if it's not fired as we expect
        let onFocus = () => {
            // wait for runloop to finish so that the new class has been rendered
            wait().then(() => {
                expect($(find('.gh-input')).hasClass('focus'), 'has focused class on first render with autofocus')
                    .to.be.true;

                done();
            });
        };

        this.set('onFocus', onFocus);
        this.set('text', '');

        this.render(hbs`{{gh-cm-editor text class="gh-input" update=(action (mut text)) focus-in=(action onFocus)}}`);

        // CodeMirror polls the input for changes every 100ms
        click('textarea');
        triggerEvent('textarea', 'focus');
    });

    it('handles blur event', async function () {
        this.set('text', '');
        this.render(hbs`{{gh-cm-editor text class="gh-input" update=(action (mut text))}}`);

        expect($(find('.gh-input')).hasClass('focus')).to.be.false;

        await click('textarea');
        await triggerEvent('textarea', 'focus');

        expect($(find('.gh-input')).hasClass('focus')).to.be.true;

        await triggerEvent('textarea', 'blur');

        expect($(find('.gh-input')).hasClass('focus')).to.be.false;
    });

    it('can autofocus', function (done) {
        // CodeMirror's events are triggered outside of anything we can watch for
        // in the tests so let's run the class check when we know the event has
        // been fired and timeout if it's not fired as we expect
        let onFocus = () => {
            // wait for runloop to finish so that the new class has been rendered
            wait().then(() => {
                expect(this.$('.gh-input').hasClass('focus'), 'has focused class on first render with autofocus')
                    .to.be.true;

                done();
            });
        };

        this.set('onFocus', onFocus);
        this.set('text', '');

        this.render(hbs`{{gh-cm-editor text class="gh-input" update=(action (mut text)) autofocus=true focus-in=(action onFocus)}}`);
    });
});
