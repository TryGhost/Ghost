import assert from 'node:assert/strict';
import { inlineCss } from '../../../../../core/server/lib/email-rendering/inline-css';

describe('inlineCss', function () {
  it('inlines stylesheet rules and removes the style tags', function () {
    assert.equal(
      inlineCss('<style>p { color: red; }</style><p>Text</p>'),
      '<p style="color: red;">Text</p>',
    );
  });

  it('inlines pseudo-elements as spans', function () {
    assert.equal(
      inlineCss('<style>p::before { content: "Hi"; color: red; }</style><p>Text</p>'),
      '<p><span style="color: red;">Hi</span>Text</p>',
    );
  });

  it('leaves CSS variables unresolved, so a nameless declaration does not throw', function () {
    const html = inlineCss(
      '<style>p { color: var(--accent); }</style><p style=": red; --accent: blue">Text</p>',
    );

    assert.ok(html.includes('color: var(--accent);'), html);
    assert.ok(!html.includes('<style'), html);
  });
});
