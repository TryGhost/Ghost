import loginAsRole from '../../helpers/login-as-role';
import {expect} from 'chai';
import {find, settled, triggerEvent, waitFor, waitUntil} from '@ember/test-helpers';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

async function selectTextWithHover(element, start = 0, end = element.textContent.length) {
    const range = document.createRange();
    const sel = window.getSelection();
  
    range.setStart(element.childNodes[0], start);
    range.setEnd(element.childNodes[0], end);
  
    sel.removeAllRanges();
    sel.addRange(range);
  
    // Trigger selection change event
    document.dispatchEvent(new Event('selectionchange'));
    await settled();
  
    // Simulate moving the mouse over the selection
    await triggerEvent(element, 'mouseover');
    await triggerEvent(element,'mouseenter');
    return;
}

describe('Editor tests with roles', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);
    describe('Super Editor tests', function () {
        beforeEach(async function () {
            this.server.loadFixtures();
            await loginAsRole('Super Editor', this.server);
        });

        it('can select text and trigger the snippet menu', async function () {
            const post = this.server.create('post', {lexical: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"This is a test","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}'});
            await visit(`/editor/post/${post.id}`);
            await waitFor('[data-secondary-instance="false"] [data-lexical-editor]');
            // find the post content
            expect(find('[data-secondary-instance="false"] [data-lexical-editor]')).to.contain.text('This is a test');

            await selectTextWithHover(find('.kg-prose p span'));
            await settled();
            await waitUntil(() => document.querySelectorAll('[data-kg-toolbar-button="snippet"]').length > 0);
            let snippetButton = document.querySelector('[data-kg-toolbar-button="snippet"]');
            expect(snippetButton).to.not.be.null;
            expect(snippetButton.textContent.trim()).to.equal('Save as snippet');
        });
    });
});