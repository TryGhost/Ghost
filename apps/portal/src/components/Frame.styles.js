/** By default, CRAs webpack bundle combines and appends the main css at root level, so they are not applied inside iframe
 * This uses a hack where we append `<style> </style>` tag with all CSS inside the head of iframe dynamically, thus making it available easily
 * We can create separate variables to keep styles grouped logically, and export them as one appended string
*/

import {GlobalStyles} from './Global.styles';
import {ActionButtonStyles} from './common/ActionButton';
import {BackButtonStyles} from './common/BackButton';
import {SwitchStyles} from './common/Switch';
import AccountHomePageStyles from './pages/AccountHomePage/AccountHomePage.css';
import {AccountPlanPageStyles} from './pages/AccountPlanPage';
import {InputFieldStyles} from './common/InputField';
import {SignupPageStyles} from './pages/SignupPage';
import {ProductsSectionStyles} from './common/ProductsSection';
import {AvatarStyles} from './common/MemberGravatar';
import {MagicLinkStyles} from './pages/MagicLinkPage';
import {PopupNotificationStyles} from './common/PopupNotification';
import {OfferPageStyles} from './pages/OfferPage';
import {FeedbackPageStyles} from './pages/FeedbackPage';
import EmailSuppressedPage from './pages/EmailSuppressedPage.css';
import EmailSuppressionFAQ from './pages/EmailSuppressionFAQ.css';
import EmailReceivingFAQ from './pages/EmailReceivingFAQ.css';
import {TipsAndDonationsSuccessStyle} from './pages/SupportSuccess';
import {TipsAndDonationsErrorStyle} from './pages/SupportError';
import {RecommendationsPageStyles} from './pages/RecommendationsPage';
import NotificationStyle from './Notification.styles';

// Global styles
const FrameStyles = `
.gh-portal-main-title {
    text-align: center;
    color: var(--grey0);
    line-height: 1.1em;
    text-wrap: pretty;
}

.gh-portal-text-disabled {
    color: var(--grey3);
    font-weight: normal;
    opacity: 0.35;
}

.gh-portal-text-center {
    text-align: center;
    text-wrap: pretty;
}

.gh-portal-input-label {
    color: var(--grey1);
    font-size: 1.3rem;
    font-weight: 600;
    margin-bottom: 2px;
    letter-spacing: 0px;
}

.gh-portal-setting-data {
    color: var(--grey6);
    font-size: 1.3rem;
    line-height: 1.15em;
}

.gh-portal-error {
    color: var(--red);
    font-size: 1.4rem;
    line-height: 1.6em;
    margin: 12px 0;
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

.gh-portal-btn:disabled {
    opacity: 0.5 !important;
    cursor: auto;
}

.gh-portal-btn-container.sticky {
    transition: none;
    position: sticky;
    bottom: 0;
    margin: 0 0 -32px;
    padding: 32px 0 32px;
    background: linear-gradient(0deg, rgba(var(--whitergb),1) 75%, rgba(var(--whitergb),0) 100%);
}

.gh-portal-btn-container.sticky.m28 {
    margin: 0 0 -28px;
    padding: 28px 0 28px;
}

.gh-portal-btn-container.sticky.m24 {
    margin: 0 0 -24px;
    padding: 24px 0 24px;
}

.gh-portal-signup-terms-wrapper + .gh-portal-btn-container {
    margin: 16px 0 0;
}

.gh-portal-signup-terms-wrapper + .gh-portal-btn-container.sticky.m24 {
    padding: 16px 0 24px;
}

.gh-portal-btn-container .gh-portal-btn {
    margin: 0;
}

.gh-portal-btn-icon svg {
    width: 16px;
    height: 16px;
    margin-inline-end: 4px;
    stroke: currentColor;
}

.gh-portal-btn-icon svg path {
    stroke: currentColor;
}

.gh-portal-btn-link {
    line-height: 1;
    background: none;
    padding: 0;
    height: unset;
    min-width: unset;
    box-shadow: none;
    border: none;
}

.gh-portal-btn-link:hover {
    box-shadow: none;
    opacity: 0.85;
}

.gh-portal-btn-branded {
    color: var(--brandcolor);
}

.gh-portal-btn-list {
    font-size: 1.5rem;
    color: var(--brandcolor);
    height: 38px;
    width: unset;
    min-width: unset;
    padding: 0 4px;
    margin: 0 -4px;
    box-shadow: none;
    border: none;
}

.gh-portal-btn-list:hover {
    box-shadow: none;
    opacity: 0.75;
}

.gh-portal-btn-logout {
    position: absolute;
    top: 22px;
    left: 24px;
    background: none;
    border: none;
    height: unset;
    color: var(--grey3);
    padding: 0;
    margin: 0;
    z-index: 999;
    box-shadow: none;
}

html[dir="rtl"] .gh-portal-btn-logout {
    left: unset;
    right: 24px;
}

.gh-portal-btn-logout .label {
    opacity: 0;
    transform: translateX(-6px);
    transition: all 0.2s ease-in-out;
}

.gh-portal-btn-logout:hover {
    padding: 0;
    margin: 0;
    background: none;
    border: none;
    height: unset;
    box-shadow: none;
}

.gh-portal-btn-logout:hover .label {
    opacity: 1.0;
    transform: translateX(-4px);
}

.gh-portal-btn-site-title-back {
    transition: transform 0.25s ease-in-out;
    z-index: 10000;
}

.gh-portal-btn-site-title-back span {
    margin-inline-end: 4px;
    transition: transform 0.4s cubic-bezier(0.1, 0.7, 0.1, 1);
}
html[dir="rtl"] .gh-portal-btn-site-title-back span {
    transform: scaleX(-1);
    -webkit-transform: scaleX(-1);
}

.gh-portal-btn-site-title-back:hover span {
    transform: translateX(-3px);
}

@media (max-width: 960px) {
    .gh-portal-btn-site-title-back {
        display: none;
    }
}

.gh-portal-logouticon {
    color: var(--grey9);
    cursor: pointer;
    width: 23px;
    height: 23px;
    padding: 6px;
    transform: translateX(0);
    transition: all 0.2s ease-in-out;
}

.gh-portal-logouticon path {
    stroke: var(--grey9);
    transition: all 0.2s ease-in-out;
}

.gh-portal-btn-logout:hover .gh-portal-logouticon {
    transform: translateX(-2px);
}

.gh-portal-btn-logout:hover .gh-portal-logouticon path {
    stroke: var(--grey3);
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

.gh-portal-popup-background.preview {
    background: linear-gradient(45deg, rgba(255,255,255,1) 0%, rgba(249,249,250,1) 100%);
    animation: none;
    pointer-events: none;
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

.gh-portal-popup-wrapper.full-size {
    height: 100vh;
    padding: 0;
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

.gh-portal-popup-container.large-size {
    width: 100%;
    max-width: 720px;
    justify-content: flex-start;
    padding: 0;
}

.gh-portal-popup-container.full-size {
    width: 100vw;
    min-height: 100vh;
    justify-content: flex-start;
    animation: popup-full-size 0.25s ease-in-out;
    margin: 0;
    border-radius: 0;
    transform: translateY(0px);
    transform-origin: top;
    padding: 2vmin 6vmin;
    padding-bottom: 4vw;
}

.gh-portal-popup-container.full-size.account-plan {
    justify-content: flex-start;
    padding-top: 4vw;
}

.gh-portal-popup-container.preview {
    animation: none !important;
}

.gh-portal-popup-wrapper.preview.offer {
    padding-top: 0;
}

.gh-portal-popup-container.preview.offer {
    max-width: 420px;
    transform: scale(0.9);
    margin-top: 3.2vw;
}

@media (max-width: 480px) {
    .gh-portal-popup-container.preview.offer {
        transform-origin: top;
        margin-top: 0;
    }
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

@keyframes popup-full-size {
    0% {
        transform: translateY(0px);
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

.gh-portal-powered {
    position: absolute;
    bottom: 24px;
    left: 24px;
    z-index: 9999;
}
html[dir="rtl"] .gh-portal-powered {
    left: unset;
    right: 24px;
}

.gh-portal-powered a {
    border: none;
    display: flex;
    align-items: center;
    line-height: 0;
    border-radius: 4px;
    background: #ffffff;
    padding: 6px 8px 6px 7px;
    color: #303336;
    font-size: 1.25rem;
    letter-spacing: -0.2px;
    font-weight: 500;
    text-decoration: none;
    transition: color 0.5s ease-in-out;
    width: 146px;
    height: 28px;
    line-height: 28px;
}
html[dir="rtl"] .gh-portal-powered a {
    padding: 6px 7px 6px 8px;
}

.gh-portal-powered a:hover {
    color: #15171A;
}

@keyframes powered-fade-in {
    0% {
        transform: scale(0.98);
        opacity: 0;
    }
    75% {
        opacity: 1.0;
    }
    100%{
        transform: scale(1);
    }
}

.gh-portal-powered a svg {
    height: 16px;
    width: 16px;
    margin: 0;
    margin-inline-end: 6px;
}

.gh-portal-powered.outside.full-size {
    display: none;
}

/* Sets the main content area of the popup scrollable.
/* 12vw is the sum horizontal padding of the popup container
*/
.gh-portal-content {
    position: relative;
}

/* Hide scrollbar for Chrome, Safari and Opera */
.gh-portal-content::-webkit-scrollbar {
    display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.gh-portal-content {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
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

.gh-portal-popup-wrapper.full-size .gh-portal-closeicon-container,
.gh-portal-popup-container.full-size .gh-portal-closeicon-container {
    top: 20px;
    right: 20px;
}
html[dir="rtl"] .gh-portal-popup-wrapper.full-size .gh-portal-closeicon-container,
html[dir="rtl"] .gh-portal-popup-container.full-size .gh-portal-closeicon-container {
    right: unset;
    left: 20px;
}

.gh-portal-popup-wrapper.full-size .gh-portal-closeicon,
.gh-portal-popup-container.full-size .gh-portal-closeicon {
    color: var(--grey6);
    width: 24px;
    height: 24px;
}

.gh-portal-logout-container {
    position: absolute;
    top: 8px;
    left: 8px;
}

html[dir="rtl"] .gh-portal-logout-container {
    left: unset;
    right: 8px;
}

.gh-portal-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-bottom: 24px;
}

.gh-portal-section {
    margin-bottom: 40px;
}

.gh-portal-section.form {
    margin-bottom: 20px;
}

.gh-portal-section.flex {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.gh-portal-detail-header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: -2px 0 40px;
}

.gh-portal-detail-footer .gh-portal-btn {
    min-width: 90px;
}

.gh-portal-action-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-direction: column;
    gap: 12px;
}

.gh-portal-footer-secondary {
    display: flex;
    font-size: 14.5px;
    letter-spacing: 0.3px;
}

.gh-portal-footer-secondary button {
    font-size: 14.5px;
}

.gh-portal-footer-secondary-light {
    color: var(--grey7);
}

.gh-portal-list-header {
    font-size: 1.25rem;
    font-weight: 500;
    color: var(--grey3);
    text-transform: uppercase;
    letter-spacing: 0.2px;
    line-height: 1.7em;
    margin-bottom: 4px;
}

.gh-portal-list + .gh-portal-list-header {
    margin-top: 28px;
}

.gh-portal-list + .gh-portal-action-footer {
    margin-top: 40px;
}

.gh-portal-list {
    background: var(--white);
    padding: 20px;
    border-radius: 8px;
    border: 1px solid var(--grey12);
}

.gh-portal-newsletter-selection {
    max-width: 460px;
    margin: 0 auto;
}

.gh-portal-newsletter-selection .gh-portal-list {
    margin-bottom: 40px;
}

.gh-portal-lock-icon-container {
    display: flex;
    justify-content: center;
    flex: 44px 0 0;
    padding-top: 6px;
}

.gh-portal-lock-icon {
    width: 14px;
    height: 14px;
    overflow: visible;
}

.gh-portal-lock-icon path {
    color: var(--grey2);
}

.gh-portal-text-large {
    font-size: 1.8rem;
    font-weight: 600;
}

.gh-portal-list section {
    display: flex;
    align-items: center;
    margin: 0 -20px 20px;
    padding: 0 20px 20px;
    border-bottom: 1px solid var(--grey12);
}

.gh-portal-list section:last-of-type {
    margin-bottom: 0;
    padding-bottom: 0;
    border: none;
}

.gh-portal-list-detail {
    flex-grow: 1;
}

.gh-portal-list-detail h3 {
    font-size: 1.5rem;
    font-weight: 600;
}

.gh-portal-list-detail.gh-portal-list-big h3 {
    font-size: 1.6rem;
    font-weight: 600;
}

.gh-portal-list-detail p {
    font-size: 1.45rem;
    letter-spacing: 0.3px;
    line-height: 1.3em;
    padding: 0;
    margin: 5px 8px 0 0;
    color: var(--grey6);
    word-break: break-word;
}
html[dir="rtl"] .gh-portal-list-detail p {
    margin: 5px 0 0 8px;
}

.gh-portal-list-detail.gh-portal-list-big p {
    font-size: 1.5rem;
}

.gh-portal-list-toggle-wrapper {
    align-items: flex-start !important;
    justify-content: space-between;
}

.gh-portal-list-toggle-wrapper .gh-portal-list-detail {
    padding: 4px 24px 4px 0px;
}
html[dir="rtl"] .gh-portal-list-toggle-wrapper .gh-portal-list-detail {
    padding: 4px 0px 4px 24px;
}

.gh-portal-list-detail .old-price {
    text-decoration: line-through;
}

.gh-portal-right-arrow {
    line-height: 1;
    color: var(--grey8);
}

.gh-portal-right-arrow svg {
    width: 17px;
    height: 17px;
    margin-top: 1px;
    margin-inline-end: -6px;
}

.gh-portal-expire-warning {
    text-align: center;
    color: var(--red);
    font-weight: 500;
    font-size: 1.4rem;
    margin: 12px 0;
}

.gh-portal-cookiebanner {
    background: var(--red);
    color: var(--white);
    text-align: center;
    font-size: 1.4rem;
    letter-spacing: 0.2px;
    line-height: 1.4em;
    padding: 8px;
}

.gh-portal-publication-title {
    text-align: center;
    font-size: 1.6rem;
    letter-spacing: -.1px;
    font-weight: 700;
    text-transform: uppercase;
    color: #15212a;
    margin-top: 6px;
}

/* Icons
/* ----------------------------------------------------- */
.gh-portal-icon {
    color: var(--brandcolor);
}

/* Spacing modifiers
/* ----------------------------------------------------- */
.gh-portal-strong { font-weight: 600; }

.mt1 { margin-top: 4px; }
.mt2 { margin-top: 8px; }
.mt3 { margin-top: 12px; }
.mt4 { margin-top: 16px; }
.mt5 { margin-top: 20px; }
.mt6 { margin-top: 24px; }
.mt7 { margin-top: 28px; }
.mt8 { margin-top: 32px; }
.mt9 { margin-top: 36px; }
.mt10 { margin-top: 40px; }

.mr1 { margin-inline-end: 4px; }
.mr2 { margin-inline-end: 8px; }
.mr3 { margin-inline-end: 12px; }
.mr4 { margin-inline-end: 16px; }
.mr5 { margin-inline-end: 20px; }
.mr6 { margin-inline-end: 24px; }
.mr7 { margin-inline-end: 28px; }
.mr8 { margin-inline-end: 32px; }
.mr9 { margin-inline-end: 36px; }
.mr10 { margin-inline-end: 40px; }

.mb1 { margin-bottom: 4px; }
.mb2 { margin-bottom: 8px; }
.mb3 { margin-bottom: 12px; }
.mb4 { margin-bottom: 16px; }
.mb5 { margin-bottom: 20px; }
.mb6 { margin-bottom: 24px; }
.mb7 { margin-bottom: 28px; }
.mb8 { margin-bottom: 32px; }
.mb9 { margin-bottom: 36px; }
.mb10 { margin-bottom: 40px; }

.ml1 { margin-inline-start: 4px; }
.ml2 { margin-inline-start: 8px; }
.ml3 { margin-inline-start: 12px; }
.ml4 { margin-inline-start: 16px; }
.ml5 { margin-inline-start: 20px; }
.ml6 { margin-inline-start: 24px; }
.ml7 { margin-inline-start: 28px; }
.ml8 { margin-inline-start: 32px; }
.ml9 { margin-inline-start: 36px; }
.ml10 { margin-inline-start: 40px; }

.pt1 { padding-top: 4px; }
.pt2 { padding-top: 8px; }
.pt3 { padding-top: 12px; }
.pt4 { padding-top: 16px; }
.pt5 { padding-top: 20px; }
.pt6 { padding-top: 24px; }
.pt7 { padding-top: 28px; }
.pt8 { padding-top: 32px; }
.pt9 { padding-top: 36px; }
.pt10 { padding-top: 40px; }

.pr1 { padding-inline-end: 4px; }
.pr2 { padding-inline-end: 8px; }
.pr3 { padding-inline-end: 12px; }
.pr4 { padding-inline-end: 16px; }
.pr5 { padding-inline-end: 20px; }
.pr6 { padding-inline-end: 24px; }
.pr7 { padding-inline-end: 28px; }
.pr8 { padding-inline-end: 32px; }
.pr9 { padding-inline-end: 36px; }
.pr10 { padding-inline-end: 40px; }

.pb1 { padding-bottom: 4px; }
.pb2 { padding-bottom: 8px; }
.pb3 { padding-bottom: 12px; }
.pb4 { padding-bottom: 16px; }
.pb5 { padding-bottom: 20px; }
.pb6 { padding-bottom: 24px; }
.pb7 { padding-bottom: 28px; }
.pb8 { padding-bottom: 32px; }
.pb9 { padding-bottom: 36px; }
.pb10 { padding-bottom: 40px; }

.pl1 { padding-inline-start: 4px; }
.pl2 { padding-inline-start: 8px; }
.pl3 { padding-inline-start: 12px; }
.pl4 { padding-inline-start: 16px; }
.pl5 { padding-inline-start: 20px; }
.pl6 { padding-inline-start: 24px; }
.pl7 { padding-inline-start: 28px; }
.pl8 { padding-inline-start: 32px; }
.pl9 { padding-inline-start: 36px; }
.pl10 { padding-inline-start: 40px; }

.hidden { display: none !important; }
`;

const MobileStyles = `
@media (max-width: 1440px) {
    .gh-portal-popup-container:not(.full-size):not(.large-size):not(.preview) {
        width: 480px;
    }

    .gh-portal-popup-container.large-size {
        width: 100%;
        max-width: 600px;
    }

    .gh-portal-input {
        height: 42px;
        margin-bottom: 16px;
    }

    button[class="gh-portal-btn"],
    .gh-portal-btn-main,
    .gh-portal-btn-primary {
        height: 42px;
    }

    .gh-portal-product-price .amount {
        font-size: 32px;
        letter-spacing: -0.022em;
    }
}

@media (max-width: 960px) {
    .gh-portal-powered {
        display: flex;
        position: relative;
        bottom: unset;
        left: unset;
        background: var(--white);
        justify-content: center;
        width: 100%;
        padding-top: 32px;
    }
}

@media (min-width: 520px) {
    .gh-portal-popup-wrapper.full-size .gh-portal-popup-container.preview {
        box-shadow:
            0 0 0 1px rgba(var(--blackrgb),0.02),
            0 2.8px 2.2px rgba(var(--blackrgb), 0.02),
            0 6.7px 5.3px rgba(var(--blackrgb), 0.028),
            0 12.5px 10px rgba(var(--blackrgb), 0.035),
            0 22.3px 17.9px rgba(var(--blackrgb), 0.042),
            0 41.8px 33.4px rgba(var(--blackrgb), 0.05),
            0 100px 80px rgba(var(--blackrgb), 0.07);
        animation: none;
        margin: 32px;
        padding: 32px 32px 0;
        width: calc(100vw - 64px);
        height: calc(100vh - 160px);
        min-height: unset;
        border-radius: 12px;
        overflow: auto;
        justify-content: flex-start;
    }
}

@media (max-width: 480px) {
    .gh-portal-detail-header {
        margin-top: 4px;
    }

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

    .gh-portal-popup-container.full-size {
        justify-content: flex-start;
    }

    .gh-portal-popup-container.large-size {
        padding: 0 !important;
    }

    .gh-portal-popup-wrapper.account-home,
    .gh-portal-popup-container.account-home {
        background: var(--grey13);
    }

    .gh-portal-popup-wrapper.full-size .gh-portal-closeicon,
    .gh-portal-popup-container.full-size .gh-portal-closeicon {
        width: 16px;
        height: 16px;
    }

    /* Small width preview in Admin */
    .gh-portal-popup-wrapper.preview:not(.full-size) footer.gh-portal-signup-footer,
    .gh-portal-popup-wrapper.preview:not(.full-size) footer.gh-portal-signin-footer {
        padding-bottom: 32px;
    }

    .gh-portal-popup-container.preview:not(.full-size) {
        max-height: 660px;
        margin-bottom: 0;
    }

    .gh-portal-popup-container.preview:not(.full-size).offer {
        max-height: 860px;
        padding-bottom: 0 !important;
    }

    .gh-portal-popup-wrapper.preview.full-size {
        height: unset;
        max-height: 660px;
    }

    .gh-portal-popup-container.preview.full-size {
        max-height: 660px;
        margin-bottom: 0;
    }

    .preview .gh-portal-invite-only-notification + .gh-portal-signup-message {
        margin-bottom: 16px;
    }

    .preview .gh-portal-btn-container.sticky {
        margin-bottom: 32px;
        padding-bottom: 0;
    }

    .gh-portal-powered {
        padding-top: 12px;
        padding-bottom: 24px;
    }
}

@media (max-width: 390px) {
    .gh-portal-popup-container:not(.account-plan) .gh-portal-detail-header .gh-portal-main-title {
        font-size: 2.1rem;
        margin-top: 1px;
        padding: 0 74px;
        text-align: center;
    }

    .gh-portal-input {
        margin-bottom: 16px;
    }

    .gh-portal-signup-header,
    .gh-portal-signin-header {
        padding-bottom: 16px;
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

/* Prevent zoom */
@media (hover:none) {
    select, textarea, input[type="text"], input[type="text"], input[type="password"],
    input[type="datetime"], input[type="datetime-local"],
    input[type="date"], input[type="month"], input[type="time"],
    input[type="week"], input[type="number"], input[type="email"],
    input[type="url"] {
        font-size: 16px !important;
    }
}
`;

const MultipleProductsGlobalStyles = `
.gh-portal-popup-wrapper.multiple-products .gh-portal-input-section {
    max-width: 420px;
    margin: 0 auto;
}

/* Multiple product signup/signin-only modifications! */
.gh-portal-popup-wrapper.multiple-products {
    background: #fff;
    box-shadow: 0 3.8px 2.2px rgba(var(--blackrgb), 0.028), 0 9.2px 5.3px rgba(var(--blackrgb), 0.04), 0 17.3px 10px rgba(var(--blackrgb), 0.05), 0 30.8px 17.9px rgba(var(--blackrgb), 0.06), 0 57.7px 33.4px rgba(var(--blackrgb), 0.072), 0 138px 80px rgba(var(--blackrgb), 0.1);
    padding: 0;
    border-radius: 5px;
    height: calc(100vh - 64px);
    max-width: calc(100vw - 64px);
}

.gh-portal-popup-wrapper.multiple-products.signup {
    overflow-y: scroll;
    overflow-x: clip;
    margin: 32px auto !important;
    padding-inline-end: 0 !important; /* Override scrollbar hiding */
}

.gh-portal-popup-wrapper.multiple-products.signin {
    margin: 10vmin auto;
    max-width: 480px;
    height: unset;
}

.gh-portal-popup-wrapper.multiple-products.preview {
    height: calc(100vh - 150px) !important;
}

.gh-portal-popup-wrapper.multiple-products .gh-portal-popup-container {
    align-items: center;
    width: 100% !important;
    box-shadow: none !important;
    animation: fadein 0.35s ease-in-out;
    padding: 1vmin 0;
    transform: translateY(0px);
    margin-bottom: 0;
}

.gh-portal-popup-wrapper.multiple-products.signup .gh-portal-popup-container {
    min-height: calc(100vh - 64px);
    position: unset;
}

.gh-portal-popup-wrapper.multiple-products .gh-portal-powered {
    position: relative;
    display: flex;
    flex: 1;
    align-items: flex-end;
    justify-content: flex-start;
    bottom: unset;
    left: unset;
    width: 100%;
    z-index: 10000;
    padding-bottom: 32px;
}

@media (max-width: 670px) {
    .gh-portal-popup-wrapper.multiple-products .gh-portal-powered {
        justify-content: center;
    }
}

.gh-portal-popup-wrapper.multiple-products .gh-portal-content {
    position: unset;
    overflow-y: visible;
    max-height: unset !important;
}

@media (max-width: 960px) {
    .gh-portal-popup-wrapper.multiple-products.signup:not(.preview) {
        margin: 20px !important;
        height: 100%;
    }
}

@media (max-width: 480px) {
    .gh-portal-popup-wrapper.multiple-products {
        margin: 0 !important;
        max-width: unset !important;
        max-height: 100% !important;
        height: 100% !important;
        border-radius: 0px;
        box-shadow: none;
    }

    .gh-portal-popup-wrapper.multiple-products.signup:not(.preview) {
        margin: 0 !important;
    }

    .gh-portal-popup-wrapper.multiple-products.preview {
        height: unset !important;
        margin: 0 !important;
    }

    .gh-portal-popup-wrapper.multiple-products:not(.dev) .gh-portal-popup-container.preview {
        max-height: 640px;
    }
}

.gh-portal-popup-container.preview * {
    pointer-events: none !important;
}

.gh-portal-unsubscribe-logo {
    width: 60px;
    height: 60px;
    border-radius: 2px;
    margin-top: 12px;
    margin-bottom: 6px;
}

@media (max-width: 480px) {
    .gh-portal-unsubscribe-logo {
        width: 48px;
        height: 48px;
    }
}

.gh-portal-unsubscribe .gh-portal-main-title {
    margin-bottom: 16px;
    font-size: 2.6rem;
}

.gh-portal-unsubscribe p {
    margin-bottom: 16px;
}

.gh-portal-unsubscribe p:last-of-type {
    margin-bottom: 0;
}

.gh-portal-btn-inline {
    display: inline-block;
    margin-inline-start: 4px;
    font-size: 1.5rem;
    font-weight: 600;
    cursor: pointer;
}

.gh-portal-toggle-checked {
    transition: all 0.3s;
    transition-delay: 2s;
}

.gh-portal-checkmark-container {
    display: flex;
    opacity: 0;
    margin-inline-end: 8px;
    transition: opacity ease 0.4s 0.2s;
}

.gh-portal-checkmark-show {
    opacity: 1;
}

.gh-portal-checkmark-icon {
    height: 22px;
    color: #30cf43;
}

@keyframes fadeIn {
    0% {
        opacity: 0;
    }
    100% {
        opacity: 1;
    }
}

@keyframes fadeOut {
    0% {
        opacity: 1;
    }
    100% {
        opacity: 0;
    }
}

.gh-portal-newsletter-selection {
    animation: 0.5s ease-in-out fadeIn;
}

.gh-portal-signup {
    animation: 0.5s ease-in-out fadeIn;
}

.gh-portal-btn-different-plan {
    margin: 0 auto 24px;
    color: var(--grey6);
    font-weight: 400;
}

.gh-portal-hide {
    display: none;
}
`;

export function getFrameStyles({site}) {
    const FrameStyle =
        GlobalStyles +
        FrameStyles +
        AccountHomePageStyles +
        AccountPlanPageStyles +
        InputFieldStyles +
        ProductsSectionStyles({site}) +
        SwitchStyles +
        ActionButtonStyles +
        BackButtonStyles +
        AvatarStyles +
        MagicLinkStyles +
        SignupPageStyles +
        OfferPageStyles({site}) +
        NotificationStyle +
        PopupNotificationStyles +
        MobileStyles +
        MultipleProductsGlobalStyles +
        FeedbackPageStyles +
        EmailSuppressedPage +
        EmailSuppressionFAQ +
        EmailReceivingFAQ +
        TipsAndDonationsSuccessStyle +
        TipsAndDonationsErrorStyle +
        RecommendationsPageStyles;
    return FrameStyle;
}
