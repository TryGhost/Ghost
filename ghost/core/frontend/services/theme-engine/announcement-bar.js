const fs = require('node:fs');
const path = require('node:path');
const sanitizeHtml = require('sanitize-html');
const { escapeExpression } = require('express-hbs').handlebars.Utils;

const assets = path.join(__dirname, '../../src/announcement-bar');
const css = fs.readFileSync(path.join(assets, 'announcement-bar.css'), 'utf8');
const script = fs.readFileSync(path.join(assets, 'announcement-bar.js'), 'utf8');
const announcementMarkup = Symbol('announcementMarkup');

function head(locals, settings, preview, siteUrl) {
  const content = settings.announcement;
  const background = escapeExpression(settings.announcement_background);
  const safeContent = sanitizeHtml(content, {
    allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'a', 'span'],
    allowedAttributes: { a: ['href', 'target', 'rel', 'title'] },
  });
  locals[announcementMarkup] = `<div class="gh-announcement-bar ${background}">
    <div class="gh-announcement-bar-content">${safeContent}</div>
    <button type="button" aria-label="close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 2l20 20M22 2L2 22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button>
  </div>`;

  return `<style data-ghost-announcement>${css}</style>
<script data-announcement-bar="${escapeExpression(siteUrl)}" data-announcement="${escapeExpression(content)}"${preview ? ' data-preview' : ''}>${script}</script>`;
}

// Insert at offsets from the parsed document so the theme's HTML is served byte-for-byte around
// the bar, including code injection, custom elements and whitespace-sensitive content.
function insert(html, locals) {
  const markup = locals?.[announcementMarkup];
  if (!markup || !html.includes('<style data-ghost-announcement>')) {
    return html;
  }
  const { load } = require('cheerio');
  const $ = load(html, { sourceCodeLocationInfo: true });
  const root = $('body #announcement-bar-root').first()[0]?.sourceCodeLocation;
  if (root?.startTag && root.endTag) {
    return html.slice(0, root.startTag.endOffset) + markup + html.slice(root.endTag.startOffset);
  }
  const body = $('body')[0];
  const offset =
    body?.sourceCodeLocation?.startTag?.endOffset ??
    body?.children.find((child) => child.sourceCodeLocation)?.sourceCodeLocation.startOffset;
  if (offset === undefined) {
    return html;
  }
  return (
    html.slice(0, offset) + `<div id="announcement-bar-root">${markup}</div>` + html.slice(offset)
  );
}

module.exports = { head, insert };
