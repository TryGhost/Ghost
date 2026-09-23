const assert = require('node:assert/strict');
const {
  withAddonPostContext,
} = require('../../../../../../../../core/server/api/endpoints/utils/serializers/output/utils/addon-post-context');

describe('Add-on parent post context', function () {
  it('preserves surrounding HTML and card contents byte for byte', function () {
    const before =
      '<textarea>Raw &amp; text</textarea><!--gated comment--><script>const example = "<figure>";</script>';
    const inside =
      '<iframe sandbox="allow-scripts" srcdoc="&lt;p&gt;A &amp;amp; B&lt;/p&gt;"></iframe><template>Fallback &amp; content</template>';
    const html = `${before}<figure class="kg-card kg-addon-card" data-addon-id="one">${inside}</figure>`;
    const result = withAddonPostContext(html, '0123456789abcdef01234567');
    assert.ok(result.startsWith(before));
    assert.ok(result.endsWith(`${inside}</figure>`));
  });
  it('rebinds only opted-in portable links to the current post URL', function () {
    const html =
      '<p>Keep &amp; untouched</p><figure class="kg-addon-card" data-addon-id="one"><template class="kg-addon-card-portable"><p><a data-ghost-post-link href="https://old.test/">Listen</a><a href="https://other.test/">Other</a></p></template></figure>';
    const result = withAddonPostContext(
      html,
      '0123456789abcdef01234567',
      'https://site.test/copied/?a=1&b=2',
    );
    assert.ok(result.startsWith('<p>Keep &amp; untouched</p>'));
    assert.ok(result.includes('href="https://site.test/copied/?a=1&amp;b=2"'));
    assert.ok(result.includes('<a href="https://other.test/">Other</a>'));
    assert.ok(!result.includes('https://old.test/'));
    for (const url of [
      undefined,
      'javascript:alert(1)',
      new URL('https://site.test/').href.replace(
        'https://',
        'https://' + 'user' + ':' + 'pass' + '@',
      ),
    ]) {
      const output = withAddonPostContext(html, undefined, url);
      assert.ok(!output.includes('https://old.test/'));
      assert.ok(!output.includes('href="javascript:'));
    }
  });
  it('binds a direct-child portable anchor through the template document fragment', function () {
    const html =
      '<figure class="kg-addon-card" data-addon-id="one"><template class="kg-addon-card-portable"><a data-ghost-post-link>Listen</a></template></figure>';
    assert.ok(
      withAddonPostContext(html, undefined, 'https://site.test/post/').includes(
        'href="https://site.test/post/"',
      ),
    );
  });
  it('removes stale hints when no valid enclosing identity is available', function () {
    const html =
      '<figure class="kg-card kg-addon-card" data-addon-id="one" data-addon-post-id="old-parent"></figure>';
    assert.ok(!withAddonPostContext(html, undefined).includes('data-addon-post-id'));
    assert.ok(!withAddonPostContext(html, '" onload="alert(1)').includes('data-addon-post-id'));
  });
  it('binds every card to the current enclosing post, replacing copied parent hints', function () {
    const html =
      '<p>Body</p><figure class="kg-card kg-addon-card" data-addon-id="one" data-addon-post-id="old-parent"><iframe srcdoc="&lt;p&gt;Player&lt;/p&gt;"></iframe></figure><figure class="kg-card kg-addon-card" data-addon-id="two"></figure>';
    const id = '0123456789abcdef01234567';
    const result = withAddonPostContext(html, id);
    assert.equal((result.match(new RegExp(`data-addon-post-id="${id}"`, 'g')) || []).length, 2);
    assert.ok(!result.includes('old-parent'));
    assert.ok(result.includes('srcdoc="&lt;p&gt;Player&lt;/p&gt;"'));
    assert.equal(withAddonPostContext('<p>Ordinary content</p>', id), '<p>Ordinary content</p>');
  });
});
