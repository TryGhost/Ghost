import assert from 'node:assert/strict';
import { sanitizeNotificationHtml } from '../../../../../core/server/services/notifications/sanitize-notification-html';

const RELEASE_NOTIFICATION =
  'Ghost <a href="https://github.com/TryGhost/Ghost/releases">v6.55.0</a> has been released, <a href="https://ghost.org/update/?v=6.50.0">click here</a> to upgrade.';

const CRITICAL_NOTIFICATION = `
    <div style="text-align:center;">
        <div style="display:inline-block;max-width:560px;text-align:left;padding:40px 24px;font-family:Helvetica,Arial,sans-serif;color:#3A464C;font-size:16px;line-height:1.6;">
            <div style="text-align:center;margin:0 0 28px;">
                <img src="https://static.ghost.org/v4.0.0/images/ghost-orb-2.png" width="48" height="48" alt="Ghost">
            </div>
            <h1 style="font-size:21px;color:#15212A;font-weight:600;line-height:1.3;margin:0 0 20px;">Critical Ghost security update</h1>
            <p style="margin:0 0 16px;">Hi there,</p>
            <p style="margin:0 0 16px;">A critical security update for Ghost has been released that patches recently reported vulnerabilities. Please update your Ghost install to the latest version as soon as possible, and consider resetting your authentication credentials:</p>
            <p style="margin:0 0 16px;"><a href="https://ghost.org/help/auth-reset" style="color:#15212A;font-weight:600;">ghost.org/help/auth-reset</a></p>
            <p style="margin:0 0 16px;">Full security advisories are published here:</p>
            <p style="margin:0 0 16px;"><a href="https://github.com/TryGhost/Ghost/security/advisories" style="color:#15212A;font-weight:600;">github.com/TryGhost/Ghost/security/advisories</a></p>
            <p style="margin:0 0 16px;">How to update: <a href="https://docs.ghost.org/install/docker#updating-ghost" style="color:#15212A;font-weight:600;">Docker</a> or <a href="https://docs.ghost.org/update" style="color:#15212A;font-weight:600;">Ghost-CLI</a>.</p>
            <p style="margin:0;border-top:1px solid #EEF5F8;padding-top:20px;font-size:12px;color:#738A94;">Sent to administrators of Ghost sites.</p>
        </div>
    </div>
`;

describe('sanitizeNotificationHtml', function () {
  it('preserves release notification links', function () {
    const output = sanitizeNotificationHtml(RELEASE_NOTIFICATION);

    assert.equal(
      output,
      'Ghost <a href="https://github.com/TryGhost/Ghost/releases" target="_blank" rel="noopener noreferrer">v6.55.0</a> has been released, <a href="https://ghost.org/update/?v=6.50.0" target="_blank" rel="noopener noreferrer">click here</a> to upgrade.',
    );
  });

  it('preserves the semantic content and links used by critical notifications', function () {
    const output = sanitizeNotificationHtml(CRITICAL_NOTIFICATION);

    assert.equal(
      output.replace(/\s+/g, ' ').trim(),
      '<h1>Critical Ghost security update</h1> <p>Hi there,</p> <p>A critical security update for Ghost has been released that patches recently reported vulnerabilities. Please update your Ghost install to the latest version as soon as possible, and consider resetting your authentication credentials:</p> <p><a href="https://ghost.org/help/auth-reset" target="_blank" rel="noopener noreferrer">ghost.org/help/auth-reset</a></p> <p>Full security advisories are published here:</p> <p><a href="https://github.com/TryGhost/Ghost/security/advisories" target="_blank" rel="noopener noreferrer">github.com/TryGhost/Ghost/security/advisories</a></p> <p>How to update: <a href="https://docs.ghost.org/install/docker#updating-ghost" target="_blank" rel="noopener noreferrer">Docker</a> or <a href="https://docs.ghost.org/update" target="_blank" rel="noopener noreferrer">Ghost-CLI</a>.</p> <p>Sent to administrators of Ghost sites.</p>',
    );
  });

  it('removes executable markup, unsafe URLs, images and inline styles', function () {
    const output = sanitizeNotificationHtml(`
            <script>alert('nope')</script>
            <img src="https://example.com/tracker.png" onerror="alert(1)" width="100vw">
            <a href="javascript:alert(1)" onclick="alert(1)" style="color:#123456">Unsafe link</a>
        `);

    assert.doesNotMatch(output, /script|onerror|onclick|javascript:|style|tracker\.png|<img/);
    assert.match(output, /<a target="_blank" rel="noopener noreferrer">Unsafe link<\/a>/);
  });

  it('is idempotent for malformed namespaced markup', function () {
    const input =
      '<svg><foreignObject><p onclick="alert(1)">Keep me</p><a href="javascript:alert(1)">Unsafe link</a></foreignObject></svg><math><mtext><img src=x onerror="alert(1)">Math text</mtext></math>';
    const output = sanitizeNotificationHtml(input);

    assert.equal(
      output,
      '<p>Keep me</p><a target="_blank" rel="noopener noreferrer">Unsafe link</a>Math text',
    );
    assert.equal(sanitizeNotificationHtml(output), output);
  });
});
