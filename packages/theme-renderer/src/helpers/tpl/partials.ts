// Core helper partial templates, embedded as strings so no filesystem access
// is needed. Sources copied verbatim from
// ghost/core/core/frontend/helpers/tpl/*.hbs @ 407e032dc7.

const navigationHbs = `<ul class="nav">
    {{#foreach navigation}}
    <li class="{{link_class for=(url) class=(concat "nav-" slug)}}"><a href="{{url absolute="true"}}">{{label}}</a></li>
    {{/foreach}}
</ul>
`;

const paginationHbs = `<nav class="pagination">
    {{#if prev}}
        <a class="newer-posts" href="{{page_url prev}}"><span aria-hidden="true">&larr;</span> {{t "Newer Posts"}}</a>
    {{/if}}
    <span class="page-number">{{t "Page {page} of {totalPages}" page=page totalPages=pages}}</span>
    {{#if next}}
        <a class="older-posts" href="{{page_url next}}">{{t "Older Posts"}} <span aria-hidden="true">&rarr;</span></a>
    {{/if}}
</nav>
`;

const contentCtaHbs = `{{{html}}}
<aside class="gh-post-upgrade-cta">
    <div class="gh-post-upgrade-cta-content" style="background-color: {{@site.accent_color}}">
        {{#has visibility="paid"}}
            {{#is "page"}}
                <h2>{{t "This page is for paying subscribers only"}}</h2>
            {{else}}
                <h2>{{t "This post is for paying subscribers only"}}</h2>
            {{/is}}
        {{/has}}
        {{#has visibility="members"}}
            {{#is "page"}}
                <h2>{{t "This page is for subscribers only"}}</h2>
            {{else}}
                <h2>{{t "This post is for subscribers only"}}</h2>
            {{/is}}
        {{/has}}
        {{#has visibility="tiers"}}
            {{#is "page"}}
                <h2>{{{t "This page is for subscribers on the {tiers} only" tiers=(tiers separator=", " lastSeparator=(t " and "))}}}</h2>
            {{else}}
                <h2>{{{t "This post is for subscribers on the {tiers} only" tiers=(tiers separator=", " lastSeparator=(t " and "))}}}</h2>
            {{/is}}
        {{/has}}
        {{#if @member}}
            <a class="gh-btn" data-portal="account/plans" href="#/portal/account/plans" style="color:{{@site.accent_color}}">{{t "Upgrade your account"}}</a>
        {{else}}
            <a class="gh-btn" data-portal="signup" href="#/portal/signup" style="color:{{@site.accent_color}}">{{t "Subscribe now"}}</a>
            <p><small>{{t "Already have an account?"}} <a data-portal="signin" href="#/portal/signin">{{t "Sign in"}}</a></small></p>
        {{/if}}
    </div>
</aside>
`;

const giftToastHbs = `<style>
.gh-gift-toast {
    --gh-gift-toast-bottom: 32px;
    --gh-gift-toast-accent: {{@giftToast.accentColor}};
    --gh-gift-toast-ink: #15171a;
    --gh-gift-toast-orb-url: url("{{@giftToast.orbUrl}}");
    --gh-gift-toast-noise-url: url("{{@giftToast.noiseUrl}}");
    --gh-gift-toast-ease: cubic-bezier(0.22, 1, 0.36, 1);

    position: fixed;
    bottom: var(--gh-gift-toast-bottom);
    left: 50%;
    z-index: 99998;
    display: flex;
    align-items: center;
    gap: 12px;
    width: max-content;
    min-height: 64px;
    max-width: min(560px, calc(100vw - 32px));
    padding: 12px 48px 12px 12px;
    overflow: hidden;
    background: #ffffff;
    color: var(--gh-gift-toast-ink);
    border: none;
    border-radius: 18px;
    box-shadow: 0 0 0 1px rgba(21, 23, 26, 0.05), 0 0 28px rgba(21, 23, 26, 0.12), 0 6px 16px rgba(21, 23, 26, 0.14), 0 34px 88px rgba(21, 23, 26, 0.28);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 13px;
    line-height: 1.35;
    opacity: 0;
    transform: translate3d(-50%, 18px, 0) scale(0.985);
    animation: gh-gift-toast-enter 680ms var(--gh-gift-toast-ease) 100ms forwards;
    transition: opacity 180ms ease, transform 180ms ease;
    box-sizing: border-box;
}

.gh-gift-toast * {
    box-sizing: border-box;
}

.gh-gift-toast-media {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 40px;
    min-width: 40px;
    height: 40px;
    min-height: 40px;
    overflow: hidden;
    border-radius: 6px;
}

.gh-gift-toast-icon {
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    object-fit: cover;
}

.gh-gift-toast-icon[hidden] {
    display: none;
}

/* Fallback only — when no publication icon is set. Accent colour at 10% as
   the surface, with the Ghost orb painted in the full accent colour over it
   (the PNG is a cropped corner of the orb, so it fills the square cell), plus
   noise grain at 0.1 opacity. The orb PNG only carries a white shape
   (grayscale + alpha), so we use its alpha as a mask and fill with the accent
   colour. When an icon IS set the media has no background, so a transparent
   PNG simply shows the toast's white surface. */
.gh-gift-toast-pattern {
    display: none;
    position: absolute;
    inset: 0;
    overflow: hidden;
    background-color: color-mix(in srgb, var(--gh-gift-toast-accent) 10%, transparent);
}

.gh-gift-toast-media.is-fallback .gh-gift-toast-pattern {
    display: block;
}

.gh-gift-toast-pattern[hidden] {
    display: none;
}

.gh-gift-toast-pattern::before {
    content: '';
    position: absolute;
    inset: 0;
    background-color: var(--gh-gift-toast-accent);
    -webkit-mask-image: var(--gh-gift-toast-orb-url);
    mask-image: var(--gh-gift-toast-orb-url);
    -webkit-mask-size: cover;
    mask-size: cover;
    -webkit-mask-position: center;
    mask-position: center;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    opacity: 1;
    pointer-events: none;
}

.gh-gift-toast-pattern::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: var(--gh-gift-toast-noise-url);
    background-size: 192px 192px;
    background-position: 50% 50%;
    background-repeat: repeat;
    opacity: 0.1;
    pointer-events: none;
}

.gh-gift-toast-content {
    display: flex;
    align-items: center;
    min-width: 0;
}

.gh-gift-toast-title {
    display: block;
    min-width: 0;
    color: var(--gh-gift-toast-ink);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.25;
}

.gh-gift-toast-close {
    position: absolute;
    top: 50%;
    right: 9px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: #f1f3f5;
    color: #667085;
    cursor: pointer;
    transform: translateY(-50%);
    transition: background 140ms ease, color 140ms ease, transform 140ms ease;
}

.gh-gift-toast-close:hover {
    background: #e7eaee;
    color: #15171a;
    transform: translateY(-50%) scale(1.04);
}

.gh-gift-toast-close svg {
    width: 12px;
    height: 12px;
}

.gh-gift-toast.is-dismissed {
    opacity: 0;
    transform: translate3d(-50%, 14px, 0) scale(0.985);
    animation: none;
    pointer-events: none;
}

@keyframes gh-gift-toast-enter {
    to {
        opacity: 1;
        transform: translate3d(-50%, 0, 0) scale(1);
    }
}

@media (prefers-reduced-motion: reduce) {
    .gh-gift-toast,
    .gh-gift-toast-close {
        animation: none;
        opacity: 1;
        transition: none;
    }

    .gh-gift-toast {
        transform: translate3d(-50%, 0, 0);
    }

    .gh-gift-toast-close,
    .gh-gift-toast-close:hover {
        transform: translateY(-50%);
    }
}
</style>
<aside id="gh-gift-toast" class="gh-gift-toast" role="status" aria-live="polite">
    <div class="gh-gift-toast-media {{#if @giftToast.brandUrl}}has-brand{{else}}is-fallback{{/if}}" aria-hidden="true">
        {{#if @giftToast.brandUrl}}
            <img class="gh-gift-toast-icon" src="{{@giftToast.brandUrl}}" alt="" loading="lazy">
        {{/if}}
        <span class="gh-gift-toast-pattern"{{#if @giftToast.brandUrl}} hidden{{/if}}></span>
    </div>
    <span class="gh-gift-toast-content">
        <span class="gh-gift-toast-title">
            {{~#has visibility="members"~}}
                {{~#is "page"~}}
                    {{t "You've been gifted access to this members-only page."}}
                {{~else~}}
                    {{t "You've been gifted access to this members-only post."}}
                {{~/is~}}
            {{~else~}}
                {{~#is "page"~}}
                    {{t "You've been gifted access to this paid page."}}
                {{~else~}}
                    {{t "You've been gifted access to this paid post."}}
                {{~/is~}}
            {{~/has~}}
        </span>
    </span>
    <button type="button" class="gh-gift-toast-close" aria-label="{{t "Dismiss"}}">
        <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M3 3 L13 13 M13 3 L3 13"/>
        </svg>
    </button>
</aside>
<script>
(function(){
    var toast = document.getElementById('gh-gift-toast');
    if (!toast) return;

    var media = toast.querySelector('.gh-gift-toast-media');
    var icon = toast.querySelector('.gh-gift-toast-icon');
    var pattern = toast.querySelector('.gh-gift-toast-pattern');

    if (icon && pattern) {
        icon.addEventListener('error', function(){
            icon.hidden = true;
            pattern.hidden = false;
            if (media) {
                media.classList.remove('has-brand');
                media.classList.add('is-fallback');
            }
        });
    }

    var closeBtn = toast.querySelector('.gh-gift-toast-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function(){
            toast.classList.add('is-dismissed');
            // Defer removal so the fade/slide-out transition runs to completion.
            setTimeout(function(){
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 240);
        });
    }
})();
</script>
`;

const cancelLinkHbs = `{{#if cancel_at_period_end}}
    <a class="{{class}}" data-members-continue-subscription="{{id}}" href="javascript:">
        {{continueLabel}}
    </a>
{{else}}
    <a class="{{class}}" data-members-cancel-subscription="{{id}}" href="javascript:">
        {{cancelLabel}}
    </a>
{{/if}}

<span class="{{errorClass}}" data-members-error><!-- error message will appear here --></span>
`;

const recommendationsHbs = `{{#if recommendations}}
    <ul class="recommendations">
        {{#each recommendations as |rec|}}
        <li class="recommendation">
            <a href="{{rec.url}}" data-recommendation="{{rec.id}}" target="_blank" rel="noopener">
                <div class="recommendation-favicon">
                    {{#if rec.favicon}}
                        <img src="{{rec.favicon}}" alt="{{rec.title}}" loading="lazy" onerror="this.style.display='none';">
                    {{/if}}
                </div>
                <h5 class="recommendation-title">{{rec.title}}</h5>
                <span class="recommendation-url">{{readable_url rec.url}}</span>
                <p class="recommendation-description">{{rec.description}}</p>
            </a>
        </li>
        {{/each}}
    </ul>
{{/if}}
`;

export const coreHelperPartials: Record<string, string> = {
  navigation: navigationHbs,
  pagination: paginationHbs,
  'content-cta': contentCtaHbs,
  'gift-toast': giftToastHbs,
  cancel_link: cancelLinkHbs,
  recommendations: recommendationsHbs,
};

/**
 * Register the core helper partials (navigation, pagination, content-cta,
 * gift-toast, cancel_link, recommendations) on a handlebars environment.
 * In Ghost these are loaded from config.paths.helperTemplates by express-hbs;
 * a theme partial of the same name may be registered afterwards to override.
 */
export function registerCoreHelperPartials(hbsInstance: {
  registerPartial(name: string, source: string): void;
}): void {
  for (const [name, source] of Object.entries(coreHelperPartials)) {
    hbsInstance.registerPartial(name, source);
  }
}
