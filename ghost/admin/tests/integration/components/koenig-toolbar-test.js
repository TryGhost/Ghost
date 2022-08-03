import hbs from 'htmlbars-inline-precompile';
import {TESTING_EXPANDO_PROPERTY} from 'koenig-editor/components/koenig-editor';
import {click, find, render} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

// TODO: extract to helpers
function findEditor(element) {
    do {
        if (element[TESTING_EXPANDO_PROPERTY]) {
            return element[TESTING_EXPANDO_PROPERTY];
        }
        element = element.parentNode;
    } while (element);

    throw new Error('Unable to find ember-mobiledoc-editor from element');
}

function insertText(element, text) {
    let editor = findEditor(element);
    return new Promise((resolve) => {
        let {post} = editor;
        editor.run((postEditor) => {
            if (editor.post.isBlank) {
                let section = postEditor.builder.createMarkupSection('p');
                postEditor.insertSectionBefore(post.sections, section);
            }
            postEditor.insertText(post.tailPosition(), text);
        });

        requestAnimationFrame(resolve);
    });
}

function selectRange(element, range) {
    let editor = findEditor(element);
    return new Promise((resolve) => {
        editor.selectRange(range);

        requestAnimationFrame(resolve);
    });
}

describe('Integration: Component: koenig-editor/gh-toolbar', function () {
    setupRenderingTest();

    it('has a working "Header two" button', async function () {
        let mobiledoc;

        this.set('updateMobiledoc', newMobiledoc => mobiledoc = newMobiledoc);

        await render(hbs`<KoenigEditor @onChange={{this.updateMobiledoc}} />`);

        const editor = findEditor(find('[data-kg="editor-wrapper"]'));

        await insertText(editor.element, 'Testing');

        expect(mobiledoc.sections[0][1]).to.equal('p');

        await selectRange(editor.element, editor.range);
        await click('[data-test-button="toolbar-h3"]');

        expect(mobiledoc.sections[0][1]).to.equal('h3');
    });
});
