/* jshint expr:true */
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import {editorRendered, testInput} from '../../helpers/editor-helpers';
import sinon from 'sinon';

describe.skip('Integration: Component: gh-koenig - General Editor Tests.', function () {
    setupComponentTest('gh-koenig', {
        integration: true
    });

    beforeEach(function () {
        // set defaults
        this.set('onFirstChange', sinon.spy());
        this.set('onChange', sinon.spy());

        this.set('wordcount', 0);
        this.set('actions.wordcountDidChange', function (wordcount) {
            this.set('wordcount', wordcount);
        });

        this.set('value', {
            version: '0.3.1',
            atoms: [],
            markups: [],
            cards: [],
            sections: []});

    });

    it('Check that events have fired', function (done) {
        this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.editor-holder'
                                value=value
                                onChange=(action onChange)
                                onFirstChange=(action onFirstChange)
                                wordcountDidChange=(action 'wordcountDidChange')
                            }}`);

        editorRendered()
            .then(() => {
                let {editor} = window;
                editor.element.focus();
                return testInput('abcd efg hijk lmnop', '<p>abcd efg hijk lmnop</p>', expect);
            })
            .then(() => {
                expect(this.get('onFirstChange').calledOnce).to.be.true;
                expect(this.get('onChange').calledOnce).to.be.true;
                expect(this.get('wordcount')).to.equal(4);
                done();
            });
    });
});