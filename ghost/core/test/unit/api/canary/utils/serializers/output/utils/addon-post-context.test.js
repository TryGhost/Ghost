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
