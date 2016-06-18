import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import Ember from 'ember';
import hbs from 'htmlbars-inline-precompile';

const {run} = Ember;

describeComponent(
    'gh-trim-focus-input',
    'Integration: Component: gh-trim-focus-input',
    {
        integration: true
    },
    function () {
        it('trims value on focusOut', function () {
            this.set('text', 'some random stuff    ');
            this.render(hbs`{{gh-trim-focus-input text update=(action (mut text))}}`);

            run(() => {
                this.$('.gh-input').trigger('focusout');
            });

            expect(this.get('text')).to.equal('some random stuff');
        });

        it('does not have the autofocus attribute if not set to focus', function () {
            this.set('text', 'some text');
            this.render(hbs`{{gh-trim-focus-input text focus=false}}`);
            expect(this.$('.gh-input').attr('autofocus')).to.not.be.ok;
        });

        it('has the autofocus attribute if set to focus', function () {
            this.set('text', 'some text');
            this.render(hbs`{{gh-trim-focus-input text focus=true}}`);
            expect(this.$('.gh-input').attr('autofocus')).to.be.ok;
        });
    }
);
