import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: gh-tags-management-container', function () {
    setupComponentTest('gh-tags-management-container', {
        integration: true
    });

    it('renders', function () {
        this.set('tags', []);
        this.set('selectedTag', null);
        this.on('enteredMobile', function () {
            // noop
        });
        this.on('leftMobile', function () {
            // noop
        });

        this.render(hbs`
            {{#gh-tags-management-container tags=tags selectedTag=selectedTag enteredMobile="enteredMobile" leftMobile=(action "leftMobile")}}{{/gh-tags-management-container}}
        `);
        expect(this.$()).to.have.length(1);
    });
});
