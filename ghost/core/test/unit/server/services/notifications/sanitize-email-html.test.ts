const {assertMatchSnapshot} = require('../../../../utils/assertions');
const {sanitizeEmailHtml} = require('../../../../../core/server/services/notifications/sanitize-email-html');

// The script tag, on* handler, and javascript: URL are deliberate negative
// cases — the snapshot must show them stripped.
const FIXTURE_MESSAGE_HTML = `
    <h2>Ghost 6.50.0 is now available</h2>
    <p>This release includes a <strong>critical</strong> fix for an authentication issue. Please update <em>as soon as possible</em>.</p>
    <ul>
        <li><a href="https://github.com/TryGhost/Ghost/releases/tag/v6.50.0">Release notes</a></li>
        <li><a href="https://ghost.org/docs/update/">Upgrade guide</a></li>
    </ul>
    <p><a href="mailto:security@ghost.org">Contact security</a> if you have questions.</p>
    <script>alert('phish')</script>
    <p><a href="javascript:alert(1)" onclick="alert(1)">do not click</a></p>
`;

describe('sanitizeEmailHtml', function () {
    it('preserves safe formatting and neutralises dangerous content', function () {
        assertMatchSnapshot({output: sanitizeEmailHtml(FIXTURE_MESSAGE_HTML)});
    });
});
