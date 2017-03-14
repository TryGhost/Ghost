/* jshint expr:true */
import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import {editorRendered, testInput, waitForRender, inputText} from '../../helpers/editor-helpers';
import $ from 'jquery';

describe('Integration: Component: gh-cm-editor', function () {
    setupComponentTest('gh-koenig', {
        integration: true
    });

    it('thge slash menu appears on user input', function (done) {
        this.render(hbs`{{gh-koenig
                            apiRoot='/todo'
                            assetPath='/assets'
                            containerSelector='.editor-holder'
                        }}`);

        editorRendered()
            .then(() => {
                let {editor} = window;
                editor.element.focus();
                inputText(editor, '/');
                return waitForRender('.gh-cardmenu');
            })
            .then(() => {
                let cardMenu = $('.gh-cardmenu');
                expect(cardMenu.children().length).to.equal(7);
                done();
            });
    });
    it.skip('searches when a user types', function (done) {
        this.render(hbs`{{gh-koenig
                            apiRoot='/todo'
                            assetPath='/assets'
                            containerSelector='.editor-holder'
                        }}`);

        editorRendered()
            .then(() => {
                let {editor} = window;
                editor.element.focus();
                inputText(editor, '/');
                return waitForRender('.gh-cardmenu');
            })
            .then(() => {
                let cardMenu = $('.gh-cardmenu');
                expect(cardMenu.children().length).to.equal(7);
                return testInput(' lis', '/ lis', expect);
            })
            .then(() => {
                let cardMenu = $('.gh-cardmenu');
                expect(cardMenu.children().length).to.equal(2);
                done();
            });
    });
});
