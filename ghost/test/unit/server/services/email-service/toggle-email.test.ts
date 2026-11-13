import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { DEFAULT_NODES } from '@tryghost/kg-default-nodes';
import { htmlToLexical } from '@tryghost/kg-html-to-lexical';
import { LexicalHTMLRenderer } from '@tryghost/kg-lexical-html-renderer';

describe('Imported toggle email rendering', function () {
  it('preserves spacing and formatting in the heading and content', async function () {
    const input =
      '<div class="kg-card kg-toggle-card"><h4 class="kg-toggle-heading-text"><strong>Heading</strong> <em>words</em></h4><div class="kg-toggle-content"><p><strong>Hello</strong> <em>world</em></p></div></div>';
    const lexical = htmlToLexical(input);
    const dom = new JSDOM();

    try {
      const renderer = new LexicalHTMLRenderer({ dom, nodes: DEFAULT_NODES });
      const email = await renderer.render(lexical, { target: 'email' });
      const document = new dom.window.DOMParser().parseFromString(email, 'text/html');
      const heading = document.querySelector('.kg-toggle-heading h4');
      const content = document.querySelector('.kg-toggle-content p');

      assert.equal(heading?.textContent, 'Heading words');
      assert.equal(heading?.innerHTML, '<strong>Heading</strong> <em>words</em>');
      assert.equal(content?.textContent, 'Hello world');
      assert.equal(content?.innerHTML, '<strong>Hello</strong> <em>world</em>');
    } finally {
      dom.window.close();
    }
  });
});
