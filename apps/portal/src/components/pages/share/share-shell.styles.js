import {GlobalStyles} from '../../global.styles';
import {ShareModalStyles} from './share-modal.styles';

export const ShareShellStyles = `
${GlobalStyles}

:root {
    --brandcolor: var(--ghost-accent-color, #3eb0ef);
}

.gh-portal-share-shell {
    position: fixed;
    inset: 0;
    z-index: 3999999;
    overflow: hidden;
}

.gh-portal-main-title {
    text-align: center;
    color: var(--grey0);
    line-height: 1.1em;
    text-wrap: pretty;
}

/* Buttons
/* ----------------------------------------------------- */
.gh-portal-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 500;
    line-height: 1em;
    letter-spacing: 0.2px;
    text-align: center;
    white-space: nowrap;
    text-decoration: none;
    color: var(--grey0);
    background: var(--white);
    border: 1px solid var(--grey12);
    min-width: 80px;
    height: 44px;
    padding: 0 1.8rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all .25s ease;
    box-shadow: none;
    user-select: none;
    outline: none;
}

.gh-portal-btn:hover {
    border-color: var(--grey10);
}

/* Global layout styles
/* ----------------------------------------------------- */
.gh-portal-popup-background {
    position: absolute;
    display: block;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    animation: fadein 0.2s;
    background: linear-gradient(315deg , rgba(var(--blackrgb),0.2) 0%, rgba(var(--blackrgb),0.1) 100%);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    -webkit-transform: translate3d(0, 0, 0);
    -moz-transform: translate3d(0, 0, 0);
    -ms-transform: translate3d(0, 0, 0);
    transform: translate3d(0, 0, 0);
}

@keyframes fadein {
    0% { opacity: 0; }
    100%{ opacity: 1.0; }
}

.gh-portal-popup-wrapper {
    position: relative;
    padding: 5vmin 0 0;
    height: 100%;
    max-height: 100vh;
    overflow: scroll;
}

/* Hiding scrollbars */
.gh-portal-popup-wrapper {
    padding-inline-end: 30px !important;
    margin-inline-end: -30px !important;
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.gh-portal-popup-wrapper::-webkit-scrollbar {
    display: none;
}

.gh-portal-popup-container {
    outline: none;
    position: relative;
    display: flex;
    box-sizing: border-box;
    flex-direction: column;
    justify-content: flex-start;
    font-size: 1.5rem;
    text-align: start;
    letter-spacing: 0;
    text-rendering: optimizeLegibility;
    background: var(--white);
    width: 500px;
    margin: 0 auto 40px;
    padding: 32px;
    transform: translateY(0px);
    border-radius: 10px;
    box-shadow: 0 3.8px 2.2px rgba(var(--blackrgb), 0.028), 0 9.2px 5.3px rgba(var(--blackrgb), 0.04), 0 17.3px 10px rgba(var(--blackrgb), 0.05), 0 30.8px 17.9px rgba(var(--blackrgb), 0.06), 0 57.7px 33.4px rgba(var(--blackrgb), 0.072), 0 138px 80px rgba(var(--blackrgb), 0.1);
    animation: popup 0.25s ease-in-out;
    z-index: 9999;
}

@keyframes popup {
    0% {
        transform: translateY(-30px);
        opacity: 0;
    }
    1% {
        transform: translateY(30px);
        opacity: 0;
    }
    100%{
        transform: translateY(0);
        opacity: 1.0;
    }
}

/* Sets the main content area of the popup scrollable. */
.gh-portal-content {
    position: relative;
}

/* Hide scrollbar for Chrome, Safari and Opera */
.gh-portal-content::-webkit-scrollbar {
    display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.gh-portal-content {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.gh-portal-closeicon-container {
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 10000;
}
html[dir="rtl"] .gh-portal-closeicon-container {
    right: unset;
    left: 24px;
}

.gh-portal-closeicon {
    color: var(--grey10);
    cursor: pointer;
    width: 20px;
    height: 20px;
    padding: 12px;
    transition: all 0.2s ease-in-out;
}

.gh-portal-closeicon:hover {
    color: var(--grey5);
}

@media (max-width: 1440px) {
    .gh-portal-popup-container:not(.full-size):not(.large-size):not(.preview) {
        width: 480px;
    }
}

@media (max-width: 480px) {
    .gh-portal-popup-wrapper {
        height: 100%;
        padding: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        background: var(--white);
        overflow-y: auto;
    }

    .gh-portal-popup-container {
        width: 100% !important;
        border-radius: 0;
        overflow: unset;
        animation: popup-mobile 0.25s ease-in-out;
        box-shadow: none !important;
        transform: translateY(0);
        padding: 28px !important;
    }
}

@media (min-width: 480px) and (max-height: 880px) {
    .gh-portal-popup-wrapper {
        padding: 4vmin 0 0;
    }
}

@keyframes popup-mobile {
    0% {
        opacity: 0;
    }
    100%{
        opacity: 1.0;
    }
}

${ShareModalStyles}
`;

export default ShareShellStyles;
