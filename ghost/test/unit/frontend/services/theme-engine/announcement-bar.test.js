const assert = require('node:assert/strict');
const {
  head,
  insert,
} = require('../../../../../core/frontend/services/theme-engine/announcement-bar');

describe('Announcement bar theme rendering', function () {
  const settings = {
    announcement: '<p>Hello <a href="/news">read more</a></p>',
    announcement_background: 'dark',
  };
  const render = (body, content = settings.announcement) => {
    const locals = {};
    const assets = head(locals, { ...settings, announcement: content }, false, '/');
    return insert(`<!DOCTYPE html><html><head>${assets}</head>${body}</html>`, locals);
  };

  it('includes the styled announcement before even the first theme script', function () {
    const theme = '<script>const sample = "<body>";</script><header>Header</header>';
    const html = render(`<body data-tag=">">${theme}</body>`);
    assert.ok(html.includes('<body data-tag=">"><div id="announcement-bar-root">'));
    assert.ok(
      html.includes('<div class="gh-announcement-bar-content">' + settings.announcement + '</div>'),
    );
    assert.ok(html.endsWith(theme + '</body></html>'));
  });

  it('keeps a theme-provided slot in place and replaces its placeholder', function () {
    const html = render(
      '<body><header><section id="announcement-bar-root">placeholder</section>Nav</header></body>',
    );
    assert.ok(
      html.includes(
        '<header><section id="announcement-bar-root"><div class="gh-announcement-bar dark">',
      ),
    );
    assert.ok(html.endsWith('</section>Nav</header></body></html>'));
    assert.doesNotMatch(html, /placeholder/);
  });

  it('keeps only announcement formatting when rendering HTML supplied by a preview', function () {
    const html = render('<body></body>', '<p onclick="test()">Hello</p><script>test()</script>');
    assert.ok(html.includes('<div class="gh-announcement-bar-content"><p>Hello</p></div>'));
    assert.ok(!html.includes('<script>test()</script>'));
  });

  it('does not insert anything when the helper was excluded or its output was discarded', function () {
    const locals = {};
    const html = '<body>Hello</body>';
    assert.equal(insert(html, locals), html);
    head(locals, settings, false, '/');
    assert.equal(insert(html, locals), html);
  });
});
