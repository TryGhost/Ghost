// POC Story 5 Part B: styles for the member-facing Landing card. The card renders
// inside its own Frame (like Notification), so it gets the base gh-portal styles
// plus this. The outer wrapper keeps padding so the card's shadow stays inside
// the iframe bounds (iframes clip overflow).
//
// Long forms: the card is capped to the viewport (max-height set inline from the
// parent window height). The header and actions are pinned (flex-shrink: 0) and
// only the fields scroll, so Save / Not now stay visible.
const LandingCardStyles = `
    /* Fill the iframe and pin the card to the bottom, so when the frame is resized
       to fit the card (after measuring) the card doesn't visibly jump, only the
       transparent space above it changes. */
    html, body {
        margin: 0;
    }

    .gh-portal-landingcard-wrapper {
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        min-height: 100vh;
        padding: 16px;
        box-sizing: border-box;
    }

    .gh-portal-landingcard {
        position: relative;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: var(--white);
        border-radius: 10px;
        padding: 28px 28px 24px;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.08);
        animation: gh-portal-landingcard-slideup 0.25s ease-in-out;
        will-change: transform, opacity;
    }

    @keyframes gh-portal-landingcard-slideup {
        0% {
            transform: translateY(24px);
            opacity: 0;
        }
        100% {
            transform: translateY(0);
            opacity: 1;
        }
    }

    .gh-portal-landingcard-header {
        flex-shrink: 0;
    }

    .gh-portal-landingcard-title {
        font-size: 1.9rem;
        font-weight: 700;
        line-height: 1.25em;
        margin: 0 36px 4px 0;
        color: var(--grey0);
    }

    .gh-portal-landingcard-subtitle {
        font-size: 1.4rem;
        line-height: 1.5em;
        color: var(--grey6);
        margin: 0 0 20px;
    }

    /* Only the fields scroll when the card is capped to the viewport. The negative
       margin + padding give the scrollbar a little breathing room from the edge. */
    .gh-portal-landingcard-fields {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        margin: 0 -4px;
        padding: 0 4px;
    }

    .gh-portal-landingcard-fields .gh-portal-input-section {
        margin-bottom: 16px;
    }

    .gh-portal-landingcard-actions {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding-top: 12px;
    }

    .gh-portal-landingcard-actions .gh-portal-btn {
        width: 100%;
        margin: 0;
    }

    .gh-portal-landingcard-dismiss {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        font-size: 1.4rem;
        font-weight: 500;
        color: var(--grey6);
    }

    .gh-portal-landingcard-dismiss:hover {
        color: var(--grey3);
    }

    .gh-portal-landingcard-close {
        position: absolute;
        top: 18px;
        right: 18px;
        width: 24px;
        height: 24px;
        padding: 0;
        background: none;
        border: none;
        cursor: pointer;
        color: var(--grey7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1;
    }

    .gh-portal-landingcard-close:hover {
        color: var(--grey3);
    }

    .gh-portal-landingcard-close svg {
        width: 14px;
        height: 14px;
    }
`;

export default LandingCardStyles;
