/* jshint expr:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Ember from 'ember';

const {run} = Ember;

describeComponent(
    'gh-cm-editor',
    'Integration: Component: gh-cm-editor',
    {
        integration: true
    },
    function () {
        it('handles editor events', function () {
            this.set('text', '');

            this.render(hbs`{{gh-cm-editor class="gh-input" value=text}}`);
            let input = this.$('.gh-input');

            expect(input.hasClass('focused'), 'has focused class on first render')
                .to.be.false;

            run(() => {
                input.find('textarea').trigger('focus');
            });

            expect(input.hasClass('focused'), 'has focused class after focus')
                .to.be.true;

            run(() => {
                input.find('textarea').trigger('blur');
            });

            expect(input.hasClass('focused'), 'loses focused class on blur')
                .to.be.false;

            run(() => {
                // access CodeMirror directly as it doesn't pick up changes
                // to the textarea
                let cm = input.find('.CodeMirror').get(0).CodeMirror;
                cm.setValue('Testing');
            });

            expect(this.get('text'), 'text value after CM editor change')
                .to.equal('Testing');
        });
    }
);
