import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import run from 'ember-runloop';
import hbs from 'htmlbars-inline-precompile';

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
            this.render(hbs`{{gh-trim-focus-input text shouldFocus=false}}`);
            expect(this.$('.gh-input').attr('autofocus')).to.not.be.ok;
        });

        it('has the autofocus attribute if set to focus', function () {
            this.set('text', 'some text');
            this.render(hbs`{{gh-trim-focus-input text shouldFocus=true}}`);
            expect(this.$('.gh-input').attr('autofocus')).to.be.ok;
        });

        it('handles undefined values', function () {
            this.set('text', undefined);
            this.render(hbs`{{gh-trim-focus-input text shouldFocus=true}}`);
            expect(this.$('.gh-input').attr('autofocus')).to.be.ok;
        });

        it('handles non-string values', function () {
            this.set('text', 10);
            this.render(hbs`{{gh-trim-focus-input text shouldFocus=true}}`);
            expect(this.$('.gh-input').val()).to.equal('10');
        });
    }
);
