/* jshint expr:true */
import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import {
    findEditor,
    focusEditor,
    inputText,
    waitForRender,
    EMPTY_DOC
} from '../../helpers/editor-helpers';
import $ from 'jquery';

describe('gh-koenig: Integration: Component: gh-koenig-slashmenu', function () {
    setupComponentTest('gh-koenig-slashmenu', {
        integration: true
    });

    beforeEach(function () {
        this.set('value', EMPTY_DOC);
    });

    it('shows menu when / is typed', async function () {
        this.render(hbs`{{gh-koenig
                            apiRoot='/todo'
                            assetPath='/assets'
                            containerSelector='.gh-koenig-container'
                            mobiledoc=value
                        }}`);

        let editor = findEditor();
        await focusEditor();
        await inputText(editor, '/');
        await waitForRender('.gh-cardmenu');

        let cardMenu = $('.gh-cardmenu');
        expect(cardMenu.children().length).to.equal(7);
    });

    it('filters tools when a user types', async function () {
        this.render(hbs`{{gh-koenig
                            apiRoot='/todo'
                            assetPath='/assets'
                            containerSelector='.gh-koenig-container'
                            mobiledoc=value
                        }}`);

        let editor = findEditor();
        await focusEditor();
        await inputText(editor, '/');
        await waitForRender('.gh-cardmenu');

        let cardMenu = $('.gh-cardmenu');
        expect(cardMenu.children().length).to.equal(7);

        await inputText(editor, ' bul');
        expect(cardMenu.children().length).to.equal(1);
    });

    it('inserts card/markup when clicked');
    it('inserts card/markup when enter is pressed');

    it.skip('ul tool', async function () {
        this.set('editorMenuIsOpen', function () {});
        this.set('editorMenuIsClosed', function () {});

        this.render(hbs`{{gh-koenig
                            apiRoot='/todo'
                            assetPath='/assets'
                            containerSelector='.gh-koenig-container'
                            mobiledoc=value
                            menuIsOpen=editorMenuIsOpen
                            menuIsClosed=editorMenuIsClosed
                        }}`);

        let editor = findEditor();
        await focusEditor();
        await inputText(editor, '/');
        await waitForRender('.gh-cardmenu');

        let cardMenu = $('.gh-cardmenu');
        expect(cardMenu.children().length).to.equal(7);

        await inputText(editor, ' bul');
        expect(cardMenu.children().length).to.equal(1);

        await click('.gh-cardmenu-card');
        // TODO: check inner HTML
    });
});
