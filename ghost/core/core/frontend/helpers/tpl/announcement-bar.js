// # Announcement bar template
//
// Renders the announcement bar into `{{ghost_head}}` — markup, styles, and a
// short bootstrap that moves the markup to the top of `<body>`.
//
// It used to be a React app fetched from jsDelivr, which then called
// `/members/api/announcement/` to find out what to draw. That cost every page
// view a cross-origin script (~43KB gzipped), a second, uncacheable round trip
// to the origin, and a layout shift: the bar prepends itself above the whole
// page, so it could only push the article down *after* both requests resolved.
// On a slow connection that lands seconds into the page's life, which is what
// pushed CLS on announcement-enabled sites from ~0.004 to ~0.039 on desktop and
// ~0.03 to ~0.09 on mobile.
//
// `ghost_head` already has everything the client was asking for: the
// announcement is a setting, and `loadMemberSession` runs for every front-end
// request, so the member's audience is known too. That leaves the browser two
// jobs — put the markup at the top of `<body>`, and wire the close button —
// which is a few hundred bytes of inline JavaScript, run before the first paint.
const crypto = require('crypto');
const escapeInlineJson = require('../../utils/escape-inline-json');

const DISMISSED_STORAGE_KEY = 'gh-announcement-dismissed';

// `announcement_background` is constrained to these by the settings validator.
// Resolving through the list rather than escaping the value keeps the class
// attribute closed to anything the validator ever stops enforcing.
const BACKGROUNDS = ['accent', 'dark', 'light'];
const DEFAULT_BACKGROUND = 'dark';

// The same rules the @tryghost/announcement-bar bundle used to inject at
// runtime, minified, so upgrading a site cannot change how its announcement
// looks. Rule order matters: `all: unset` deliberately sits between the
// background variants and the element rules that reinstate the parts we want
// back.
const STYLES = [
    '.gh-announcement-bar,.gh-announcement-bar *{box-sizing:border-box!important}',
    '.gh-announcement-bar{position:relative;z-index:90;display:flex;align-items:center;justify-content:center;padding:12px 48px;min-height:48px;font-size:15px;line-height:23px;text-align:center}',
    '.gh-announcement-bar.light{background-color:#f0f0f0;color:#15171a}',
    '.gh-announcement-bar.accent{background-color:var(--ghost-accent-color);color:#fff}',
    '.gh-announcement-bar.dark{background-color:#15171a;color:#fff}',
    '.gh-announcement-bar *:not(path){all:unset}',
    '.gh-announcement-bar strong{font-weight:700}',
    '.gh-announcement-bar :is(i,em){font-style:italic}',
    '.gh-announcement-bar a{color:#fff;font-weight:700;text-decoration:underline;cursor:pointer}',
    '.gh-announcement-bar.light a{color:var(--ghost-accent-color)!important}',
    '.gh-announcement-bar button{position:absolute;top:50%;right:8px;display:flex;align-items:center;justify-content:center;margin-top:-16px;width:32px;height:32px;padding:0;background-color:transparent;border:0;color:#fff;cursor:pointer}',
    '.gh-announcement-bar.light button{color:#888}',
    '.gh-announcement-bar svg{width:10px;height:10px;fill:currentColor}'
].join('');

const CLOSE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="16" width="16"><path stroke-linecap="round" stroke-width=".4" stroke="#000000" stroke-linejoin="round" d="M.44,21.44a1.49,1.49,0,0,0,0,2.12,1.5,1.5,0,0,0,2.12,0l9.26-9.26a.25.25,0,0,1,.36,0l9.26,9.26a1.5,1.5,0,0,0,2.12,0,1.49,1.49,0,0,0,0-2.12L14.3,12.18a.25.25,0,0,1,0-.36l9.26-9.26A1.5,1.5,0,0,0,21.44.44L12.18,9.7a.25.25,0,0,1-.36,0L2.56.44A1.5,1.5,0,0,0,.44,2.56L9.7,11.82a.25.25,0,0,1,0,.36Z" fill="currentColor"></path></svg>';

// Called with the payload below as `d`. Written as ES5 so it needs no
// transpiling, and as fragments so the shipped bytes carry no indentation.
const BOOTSTRAP = [
    '(function(d){',
    // Dismissal is session-scoped and keyed by the announcement itself, so
    // editing an announcement shows it again to a reader who dismissed the
    // previous one. Both accessors are guarded because sessionStorage throws
    // when site data is blocked (private modes, embedded contexts) — a reader
    // with storage off should still see the bar, they just can't dismiss it.
    'var K="' + DISMISSED_STORAGE_KEY + '";',
    'function seen(){try{return sessionStorage.getItem(K)===d.k}catch(e){return false}}',
    'function dismiss(){try{sessionStorage.setItem(K,d.k)}catch(e){}}',
    'if(seen())return;',
    'function show(){',
    // Mirrors the old bundle's guard, which reused an existing root div rather
    // than adding a second one when a theme calls `{{ghost_head}}` twice.
    'if(document.getElementById("announcement-bar-root"))return;',
    'document.body.insertAdjacentHTML("afterbegin",d.h);',
    // The node we just inserted, by definition.
    'var r=document.body.firstElementChild;',
    'r.querySelector("button").addEventListener("click",function(){r.remove();dismiss()});',
    '}',
    // `{{ghost_head}}` runs while <body> is still a parser token away, so wait
    // for it. A MutationObserver callback is a microtask, and microtasks always
    // drain before the browser's next paint — so the bar is in the layout of
    // the very first frame and never shifts anything that was already drawn.
    'function ready(){if(!document.body)return false;show();return true}',
    'function whenReady(){if(ready())return;new MutationObserver(function(_,o){if(ready())o.disconnect()}).observe(document.documentElement,{childList:true})}',
    'if(!d.u)return whenReady();',
    // `d.u` is set when ghost_head could not resolve the audience itself
    // (`cacheMembersContent`): the HTML is shared by every member on a tier, so
    // only the members API can say whether this reader is in the audience.
    'fetch(d.u).then(function(r){return r.json()}).then(function(b){if(b.announcement&&b.announcement[0]&&b.announcement[0].announcement)whenReady()});',
    '})'
].join('');

/**
 * Identity of an announcement, for session-scoped dismissal. Short because it
 * ships in every page's HTML, and a hash rather than the content itself so the
 * content is not duplicated in the payload.
 *
 * @param {string} announcement
 * @returns {string}
 */
function contentKey(announcement) {
    return crypto.createHash('sha256').update(announcement).digest('hex').slice(0, 12);
}

/**
 * @param {string} announcement - the announcement's HTML, authored in Admin
 * @param {string} [background] - `accent` | `dark` | `light`
 * @returns {string}
 */
function renderMarkup(announcement, background) {
    const variant = BACKGROUNDS.includes(background) ? background : DEFAULT_BACKGROUND;

    return '<div id="announcement-bar-root">' +
        `<div class="gh-announcement-bar ${variant}">` +
        `<div class="gh-announcement-bar-content">${announcement}</div>` +
        `<button aria-label="close">${CLOSE_ICON}</button>` +
        '</div>' +
        '</div>';
}

/**
 * The `<style>` and `<script>` pair to drop into `{{ghost_head}}`.
 *
 * The announcement's HTML travels inside a JSON payload rather than as markup
 * in the head, so an Admin-API-authored announcement cannot reshape the
 * document: `escapeInlineJson` leaves no character that could close the script
 * element, and `insertAdjacentHTML` then parses the content in body context,
 * where it belongs.
 *
 * @param {Object} options
 * @param {string} options.announcement
 * @param {string} [options.background]
 * @param {string} [options.apiUrl] - set only when the audience has to be
 *   resolved in the browser; the bar then renders after that request resolves.
 * @returns {string}
 */
function render({announcement, background, apiUrl}) {
    const payload = {
        h: renderMarkup(announcement, background),
        k: contentKey(announcement)
    };

    if (apiUrl) {
        payload.u = apiUrl;
    }

    return `<style id="gh-announcement-bar-styles">${STYLES}</style>` +
        `<script>${BOOTSTRAP}(${escapeInlineJson(JSON.stringify(payload))})</script>`;
}

module.exports = {
    render
};
