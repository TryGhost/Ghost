/** By default, CRAs webpack bundle combines and appends the main css at root level, so they are not applied inside iframe
 * This uses a hack where we append `<style> </style>` tag with all CSS inside the head of iframe dynamically, thus making it available easily
 * We can create separate variables to keep styles grouped logically, and export them as one appeneded string
*/

import {GlobalStyles} from './Global.styles';
import {ActionButtonStyles} from './common/ActionButton';
import {BackButtonStyles} from './common/BackButton';
import {SwitchStyles} from './common/Switch';
import {AccountHomePageStyles} from './pages/AccountHomePage';
import {AccountPlanPageStyles} from './pages/AccountPlanPage';
import {InputFieldStyles} from './common/InputField';
import {SignupPageStyles} from './pages/SignupPage';
import {PlanSectionStyles} from './common/PlansSection';
import {ProductsSectionStyles} from './common/ProductsSection';
import {AvatarStyles} from './common/MemberGravatar';
import {MagicLinkStyles} from './pages/MagicLinkPage';
import {LinkPageStyles} from './pages/LinkPage';
import {PopupNotificationStyles} from './common/PopupNotification';

// Global styles
const FrameStyles = `
    .gh-portal-main-title {
        text-align: center;
        color: var(--grey0);
        line-height: 1.35em;
    }

    .gh-portal-text-disabled {
        color: var(--grey3);
        font-weight: normal;
        opacity: 0.35;
    }

    .gh-portal-text-center {
        text-align: center;
    }

    .gh-portal-input-label {
        color: var(--grey1);
        font-size: 1.3rem;
        font-weight: 500;
        margin-bottom: 2px;
        letter-spacing: 0.35px;
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
        font-size: 1.4rem;
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
        height: 42px;
        padding: 0 1.8rem;
        border-radius: 4px;
        cursor: pointer;
        transition: all .25s ease;
        box-shadow: none;
        box-shadow: 0 2px 6px -3px rgba(0,0,0,0.19);
        user-select: none;
        outline: none;
    }

    .gh-portal-btn:hover {
        border-color: var(--grey10);
    }

    .gh-portal-btn:disabled {
        opacity: 0.3 !important;
        cursor: auto;
    }

    .gh-portal-btn-icon svg {
        width: 16px;
        height: 16px;
        margin-right: 4px;
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
        font-size: 1.4rem;
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
        background: linear-gradient(315deg , rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 100%);
        backdrop-filter: blur(2px);
        -webkit-backdrop-filter: blur(2px);
        -webkit-transform: translate3d(0, 0, 0);
        -moz-transform: translate3d(0, 0, 0);
        -ms-transform: translate3d(0, 0, 0);
        transform: translate3d(0, 0, 0);
    }

    .gh-portal-popup-background.preview {
        background: #EDF0F2;
        animation: none;
    }

    @keyframes fadein {
        0% { opacity: 0; }
        100%{ opacity: 1.0; }
    }

    .gh-portal-popup-wrapper {
        position: relative;
        padding: 10vmin 0 0;
        height: 100%;
    }

    .gh-portal-popup-wrapper.fullscreen {
        margin: 32px;
        height: calc(100vh - 64px) !important;
        overflow-y: scroll;
        background: #fff;
        box-shadow: 0 3.8px 2.2px rgba(0, 0, 0, 0.028), 0 9.2px 5.3px rgba(0, 0, 0, 0.04), 0 17.3px 10px rgba(0, 0, 0, 0.05), 0 30.8px 17.9px rgba(0, 0, 0, 0.06), 0 57.7px 33.4px rgba(0, 0, 0, 0.072), 0 138px 80px rgba(0, 0, 0, 0.1);
        padding: 0;
        border-radius: 5px;
    }

    @media (max-width: 960px) {
        .gh-portal-popup-wrapper.fullscreen {
            margin: 20px;
            height: calc(100vh - 40px) !important;
        }
    }

    @media (max-width: 480px) {
        .gh-portal-popup-wrapper.fullscreen {
            margin: 0;
            height: 100vh !important;
            border-radius: 0px;
            box-shadow: none;
        }
    }
    
    @media (min-width: 480px) {
        .gh-portal-popup-wrapper.fullscreen.preview {
            height: calc(100vh - 150px) !important;
        }
    }

    .gh-portal-popup-container {
        outline: none;
        position: relative;
        display: flex;
        box-sizing: border-box;
        flex-direction: column;
        justify-content: flex-start;
        overflow: hidden;
        font-size: 1.5rem;
        text-align: left;
        letter-spacing: 0;
        text-rendering: optimizeLegibility;
        background: var(--white);
        width: 400px;
        margin: 0 auto;
        border-radius: 5px;
        box-shadow: 0 3.8px 2.2px rgba(0, 0, 0, 0.028), 0 9.2px 5.3px rgba(0, 0, 0, 0.04), 0 17.3px 10px rgba(0, 0, 0, 0.05), 0 30.8px 17.9px rgba(0, 0, 0, 0.06), 0 57.7px 33.4px rgba(0, 0, 0, 0.072), 0 138px 80px rgba(0, 0, 0, 0.1);
        animation: popup 0.25s ease-in-out;
        z-index: 9999;
    }

    .gh-portal-popup-wrapper.fullscreen .gh-portal-popup-container {
        position: unset;
        align-items: center;
        width: 100% !important;
        box-shadow: none !important;
        border-radius: 0px;
        animation: fadein 0.35s ease-in-out;
        padding: 3vmin 0;
    }

    @media (max-width: 480px) {
        .gh-portal-popup-wrapper.fullscreen .gh-portal-popup-container.preview {
            max-height: 620px;
        }
    }

    @keyframes popup {
        0% {
            transform: scale(0.9) translateY(20px);
            opacity: 0;
        }
        75% {
            opacity: 1.0;
        }
        100%{
            transform: scale(1) translateY(0);
        }
    }

    .gh-portal-powered {
        position: absolute;
        bottom: 24px;
        left: 24px;
    }
    
    .gh-portal-powered a {
        border: none;
        display: block;
        line-height: 0;
        border-radius: 4px;
    }

    .gh-portal-powered img {
        box-shadow: 0 1px 3px rgba(0,0,0,.08);
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
        margin: 0 6px 0 0;
    }

    .gh-portal-popup-wrapper.fullscreen .gh-portal-powered {
        position: relative;
        display: flex;
        justify-content: center;
        bottom: unset;
        left: unset;
        width: 100%;
        z-index: 10000;
        padding-bottom: 32px;
    }

    .gh-portal-popup-wrapper.fullscreen.signin .gh-portal-powered {
        position: absolute;
        bottom: 0;
    }

    .gh-portal-container-wide {
        width: 440px;
    }

    .gh-portal-container-narrow {
        width: 380px;
    }

    .gh-portal-popup-container.preview {
        box-shadow:
            0 0 0 1px rgba(0,0,0,0.02),
            0 2.8px 2.2px rgba(0, 0, 0, 0.02),
            0 6.7px 5.3px rgba(0, 0, 0, 0.028),
            0 12.5px 10px rgba(0, 0, 0, 0.035),
            0 22.3px 17.9px rgba(0, 0, 0, 0.042),
            0 41.8px 33.4px rgba(0, 0, 0, 0.05),
            0 100px 80px rgba(0, 0, 0, 0.07);
        animation: none;
    }

    /* Sets the main content area of the popup scrollable. 
    /* 12vw is the sum horizontal padding of the popup container 
    */
    .gh-portal-content {
        position: relative;
        overflow-y: scroll;
        padding: 24px 32px 32px;
        max-height: calc(100vh - 12vw);
    }

    .gh-portal-content.with-footer {
        overflow-y: scroll;
        padding-bottom: 0;
        max-height: calc(100vh - 12vw - 72px);
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

    .gh-portal-popup-wrapper.fullscreen .gh-portal-content {
        position: unset;
        overflow-y: visible;
        max-height: unset !important;
    }
    
    .gh-portal-popup-container footer {
        padding: 0 32px 32px;
        height: 72px;
    }

    .gh-portal-closeicon-container {
        position: absolute;
        top: 14px;
        right: 14px;
        z-index: 999;
    }

    @media (min-width: 480px) {
        .gh-portal-popup-wrapper.fullscreen .gh-portal-closeicon {
            width: 24px;
            height: 24px;
        }
        
        .gh-portal-popup-wrapper.fullscreen .gh-portal-closeicon-container {
            top: 48px;
            right: 48px;
            position: fixed;
        }
    }

    .gh-portal-closeicon {
        color: var(--grey9);
        cursor: pointer;
        width: 16px;
        height: 16px;
        padding: 12px;
        transition: all 0.2s ease-in-out;
    }

    .gh-portal-closeicon:hover {
        color: var(--grey5);
    }

    .gh-portal-logout-container {
        position: absolute;
        top: 8px;
        left: 8px;
    }

    .gh-portal-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding-bottom: 24px;
    }

    .gh-portal-section {
        margin-bottom: 32px;
    }

    .gh-portal-section.form {
        margin-bottom: 20px;
    }

    .gh-portal-detail-header {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: -4px 0 24px;
    }

    .gh-portal-detail-footer .gh-portal-btn {
        min-width: 90px;
    }

    .gh-portal-action-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
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

    .gh-portal-list {
        background: var(--white);
        padding: 20px;
        border-radius: 3px;
        box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.07), 0px 1px 1.5px 0px rgba(0, 0, 0, 0.05);
    }

    .gh-portal-list.outline {
        box-shadow: none;
        border: 1px solid var(--grey12);
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
        font-weight: 500;
    }

    .gh-portal-list-detail p {
        font-size: 1.3rem;
        letter-spacing: 0.3px;
        line-height: 1.25em;
        padding: 0;
        margin: 2px 0 0;
        color: var(--grey6);
    }

    .gh-portal-right-arrow {
        line-height: 1;
        color: var(--grey8);
    }

    .gh-portal-right-arrow svg {
        width: 17px;
        height: 17px;
        margin-top: 1px;
        margin-right: -6px;
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

    .gh-portal-popup-container.account-profile .gh-portal-action-footer {
        height: unset;
        padding-bottom: 36px;
    }

    /* Icons
    /* ----------------------------------------------------- */
    .gh-portal-icon {
        color: var(--brandcolor);
    }

    /* Spacing modifiers
    /* ----------------------------------------------------- */
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

    .mr1 { margin-right: 4px; }
    .mr2 { margin-right: 8px; }
    .mr3 { margin-right: 12px; }
    .mr4 { margin-right: 16px; }
    .mr5 { margin-right: 20px; }
    .mr6 { margin-right: 24px; }
    .mr7 { margin-right: 28px; }
    .mr8 { margin-right: 32px; }
    .mr9 { margin-right: 36px; }
    .mr10 { margin-right: 40px; }

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

    .ml1 { margin-left: 4px; }
    .ml2 { margin-left: 8px; }
    .ml3 { margin-left: 12px; }
    .ml4 { margin-left: 16px; }
    .ml5 { margin-left: 20px; }
    .ml6 { margin-left: 24px; }
    .ml7 { margin-left: 28px; }
    .ml8 { margin-left: 32px; }
    .ml9 { margin-left: 36px; }
    .ml10 { margin-left: 40px; }

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
    
    .pr1 { padding-right: 4px; }
    .pr2 { padding-right: 8px; }
    .pr3 { padding-right: 12px; }
    .pr4 { padding-right: 16px; }
    .pr5 { padding-right: 20px; }
    .pr6 { padding-right: 24px; }
    .pr7 { padding-right: 28px; }
    .pr8 { padding-right: 32px; }
    .pr9 { padding-right: 36px; }
    .pr10 { padding-right: 40px; }
    
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
    
    .pl1 { padding-left: 4px; }
    .pl2 { padding-left: 8px; }
    .pl3 { padding-left: 12px; }
    .pl4 { padding-left: 16px; }
    .pl5 { padding-left: 20px; }
    .pl6 { padding-left: 24px; }
    .pl7 { padding-left: 28px; }
    .pl8 { padding-left: 32px; }
    .pl9 { padding-left: 36px; }
    .pl10 { padding-left: 40px; }

    .hidden { display: none !important; }
`;

const MobileStyles = `
@media (max-width: 480px) {
    .gh-portal-popup-wrapper {
        height: 100%;
        padding: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        background: var(--white);
    }
    
    .gh-portal-popup-container {
        width: 100%;
        border-radius: 0;
        overflow: unset;
        animation: popup-mobile 0.25s ease-in-out;
        box-shadow: none !important;
    }

    .gh-portal-popup-wrapper.account-home,
    .gh-portal-popup-container.account-home {
        background: var(--grey13);
    }

    .gh-portal-popup-container.account-home .gh-portal-account-footer {
        border-top: none;
        padding-top: 0;
        height: unset;
    }

    .gh-portal-popup-wrapper {
        overflow-y: unset;
    }

    .gh-portal-content {
        position: relative !important;
        overflow-y: auto !important;
        max-height: unset !important;
    }

    .gh-portal-popup-wrapper.fullscreen:not(.preview) .gh-portal-content {
        max-height: calc(100vh - 180px) !important;
    }

    .gh-portal-powered {
        position: relative;
        bottom: unset;
        left: unset;
        background: var(--white);
        display: flex;
        justify-content: center;
        width: 100%;
        padding-top: 32px;
    }

    .gh-portal-popup-wrapper.account-home .gh-portal-powered {
        background: var(--grey13);
    }

    .gh-portal-powered a {
        animation: none;
        box-shadow: none;
        background: none;
        margin-bottom: 32px;
    }

    .gh-portal-powered a span {
        opacity: 0.5;
    }

    .gh-portal-powered a svg {
        opacity: 0.65;
    }

    .gh-portal-popup-wrapper.account-home .gh-portal-powered a {
        box-shadow: none;
    }
    
    .gh-portal-popup-wrapper.fullscreen .gh-portal-popup-container {
        padding: 0;
    }

    .gh-portal-popup-wrapper.fullscreen .gh-portal-powered {
        padding-bottom: 0;
        padding-top: 0;
        margin-top: -8px;
    }
}

@media (max-width: 414px) {
    .gh-portal-input {
        height: 44px;
    }

    .gh-portal-btn:not(.gh-portal-btn-link):not(.gh-portal-btn-back) {
        min-height: 44px;
    }
}

@media (max-width: 390px) {
    .gh-portal-plans-container {
        flex-direction: column;
    }

    .gh-portal-plan-section {
        display: grid;
        padding: 12px 10px;
        grid-template-columns: 32px auto auto;
        grid-template-rows: auto auto;
        justify-items: start;
        min-height: 60px;
        border-right: none;
        border-bottom: 1px solid var(--grey10);
    }

    div:not(.gh-portal-product-card-header) > .gh-portal-plan-checkbox {
        grid-column: 1 / 2;
        grid-row: 1 / 3;
        margin: 0 12px;
    }

    .gh-portal-plan-pricelabel {
        grid-column: 3 / 4;
        grid-row: 1 / 3;
        justify-self: end;
        align-items: center;
        margin: 0 4px 0 12px;
    }

    .gh-portal-plan-name {
        text-transform: none;
        font-size: 1.4rem;
        letter-spacing: 0.2px;
        margin: 0;
    }

    .gh-portal-plan-featurewrapper {
        margin: 0;
        padding: 0;
        border: none;
        align-items: flex-start;
    }

    .gh-portal-plan-feature {
        text-align: left;
    }

    .gh-portal-plan-section:last-of-type {
        border-bottom: none;
    }

    .gh-portal-plan-section:first-of-type::before {
        border-radius: 5px 5px 0 0;
    }

    .gh-portal-plan-section:last-of-type::before {
        border-radius: 0 0 5px 5px;
    }

    .gh-portal-input {
        font-size: 1.4rem;
        margin-bottom: 16px;
    }

    .gh-portal-content {
        padding: 24px;
    }

    .gh-portal-popup-container footer {
        padding-right: 24px;
        padding-bottom: 24px;
        padding-left: 24px;
    }

    .gh-portal-signup-header,
    .gh-portal-signin-header {
        padding-bottom: 16px;
    }

    .gh-portal-account-main {
        padding: 24px 24px 0;
    }

    .gh-portal-powered {
        padding-top: 12px;
    }
}

@media (min-width: 768px) and (max-height: 768px) {
    .gh-portal-signup-header,
    .gh-portal-signin-header {
        padding-bottom: 16px;
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
`;

// Append all styles as string which we want to pass to iframe
const FrameStyle =
    GlobalStyles +
    FrameStyles +
    AccountHomePageStyles +
    AccountPlanPageStyles +
    InputFieldStyles +
    PlanSectionStyles +
    ProductsSectionStyles +
    SwitchStyles +
    ActionButtonStyles +
    BackButtonStyles +
    AvatarStyles +
    MagicLinkStyles +
    LinkPageStyles +
    SignupPageStyles +
    PopupNotificationStyles +
    MobileStyles;

export default FrameStyle;