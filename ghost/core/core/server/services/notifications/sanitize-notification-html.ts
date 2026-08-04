import sanitizeHtml from 'sanitize-html';

// Notification bodies reach admin users as *rendered HTML*, both in email and
// in Ghost Admin itself (the client marks server notifications `htmlSafe`).
// Two untrusted sources feed this: the upstream update-check feed, and any API
// client permitted to POST /notifications/. Neither must be able to ship
// scripts, event handlers, or non-http(s) URLs to an admin's browser.
//
// This is the single enforced trust boundary for notification HTML - the
// clients deliberately render it unescaped so release notes can carry links,
// so the guarantee has to hold here.
const ALLOWED_TAGS = [
    'p', 'br', 'hr',
    'strong', 'b', 'em', 'i', 'u', 'code',
    'a',
    'ul', 'ol', 'li',
    'blockquote',
    'h1', 'h2', 'h3', 'h4'
];

const ALLOWED_SCHEMES = ['http', 'https', 'mailto'];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
        a: ['href', 'title', 'target', 'rel']
    },
    allowedSchemes: ALLOWED_SCHEMES,
    allowProtocolRelative: false,
    transformTags: {
        a: sanitizeHtml.simpleTransform('a', {
            target: '_blank',
            rel: 'noopener noreferrer'
        })
    }
};

export function sanitizeNotificationHtml(html: string): string {
    return sanitizeHtml(html, SANITIZE_OPTIONS);
}
