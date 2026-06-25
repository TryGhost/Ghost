const {escapeExpression} = require('../../services/handlebars');

// Self-contained HTML+CSS+JS injected at the bottom of the body on gift-link
// renders (when `@gift` is set). Renders the selected split toast at the bottom
// of the viewport announcing the gift, with a persistent close button.
//
// Designed to be theme-agnostic: scoped class names with a `gh-gift-toast`
// prefix, an `accent` CSS custom property fed from the site's accent color, and
// no global selectors so it cannot leak into theme styles.
module.exports = function buildGiftToast({accentColor, logoUrl, iconUrl, orbUrl, noiseUrl} = {}) {
    const safeAccent = escapeExpression(accentColor || '#000000');
    const safeLogoUrl = logoUrl ? escapeExpression(logoUrl) : null;
    const safeIconUrl = iconUrl ? escapeExpression(iconUrl) : null;
    const safeOrbUrl = orbUrl ? escapeExpression(orbUrl) : '';
    const safeNoiseUrl = noiseUrl ? escapeExpression(noiseUrl) : '';
    const brandUrl = safeLogoUrl || safeIconUrl;
    const mediaClassName = `gh-gift-toast-media ${brandUrl ? 'has-brand' : 'is-fallback'}`;

    return `
<style>
.gh-gift-toast {
    --gh-gift-toast-bottom: 32px;
    --gh-gift-toast-accent: ${safeAccent};
    --gh-gift-toast-ink: #15171a;
    --gh-gift-toast-orb-url: url("${safeOrbUrl}");
    --gh-gift-toast-noise-url: url("${safeNoiseUrl}");
    --gh-gift-toast-ease: cubic-bezier(0.22, 1, 0.36, 1);

    position: fixed;
    bottom: var(--gh-gift-toast-bottom);
    left: 50%;
    z-index: 99998;
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr);
    align-items: stretch;
    width: max-content;
    min-height: 64px;
    max-width: min(560px, calc(100vw - 32px));
    padding: 0;
    overflow: hidden;
    background: transparent;
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
    width: 64px;
    height: 64px;
    overflow: hidden;
    background: var(--gh-gift-toast-accent);
    color: #ffffff;
}

.gh-gift-toast-logo {
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    object-fit: cover;
}

.gh-gift-toast-logo[hidden] {
    display: none;
}

/* Mirrors the gift card aesthetic from apps/portal/src/components/pages/gift-page.js:
   accent color base, Ghost orb at 0.2 opacity, noise grain at 0.1 opacity. */
.gh-gift-toast-pattern {
    display: none;
    position: absolute;
    inset: 0;
    overflow: hidden;
    background-color: var(--gh-gift-toast-accent);
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
    background-image: var(--gh-gift-toast-orb-url);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    opacity: 0.2;
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
    min-height: 64px;
    padding: 10px 44px 10px 14px;
    background: #ffffff;
}

.gh-gift-toast-copy {
    display: flex;
    min-width: 0;
}

.gh-gift-toast-title {
    display: block;
    min-width: 0;
    color: var(--gh-gift-toast-ink);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.25;
    white-space: nowrap;
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

@media (max-width: 600px) {
    .gh-gift-toast {
        width: calc(100vw - 32px);
    }

    .gh-gift-toast-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
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
    <div class="${mediaClassName}" aria-hidden="true">
        ${brandUrl ? `<img class="gh-gift-toast-logo" src="${brandUrl}" alt="" loading="lazy">` : ''}
        <span class="gh-gift-toast-pattern"${brandUrl ? ' hidden' : ''}></span>
    </div>
    <span class="gh-gift-toast-content">
        <span class="gh-gift-toast-copy">
            <span class="gh-gift-toast-title">You’ve been gifted access to this post.</span>
        </span>
    </span>
    <button type="button" class="gh-gift-toast-close" aria-label="Dismiss">
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
    var logo = toast.querySelector('.gh-gift-toast-logo');
    var pattern = toast.querySelector('.gh-gift-toast-pattern');

    if (logo && pattern) {
        logo.addEventListener('error', function(){
            logo.hidden = true;
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
};
