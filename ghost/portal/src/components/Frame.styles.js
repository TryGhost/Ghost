/** By default, CRAs webpack bundle combines and appends the main css at root level, so they are not applied inside iframe
 * This uses a hack where we append `<style> </style>` tag with all CSS inside the head of iframe dynamically, thus making it available easily
 * We can create separate variables to keep styles grouped logically, and export them as one appeneded string
*/

import {ActionButtonStyles} from './common/ActionButton';
import {SwitchStyles} from './common/Switch';
import {AccountHomePageStyles} from './pages/AccountHomePage';
import {AccountPlanPageStyles} from './pages/AccountPlanPage';
import {InputFieldStyles} from './common/InputField';
import {SignupPageStyles} from './pages/SignupPage';
import {PlanSectionStyles} from './common/PlansSection';
import {AvatarStyles} from './common/MemberGravatar';
import {MagicLinkStyles} from './pages/MagicLinkPage';
import {LinkPageStyles} from './pages/LinkPage';

// Global styles
const GlobalStyles = `

    /* Colors
    /* ----------------------------------------------------- */
    :root {
        --black: #000;
        --grey0: #1d1d1d;
        --grey1: #333;
        --grey2: #3d3d3d;
        --grey3: #474747;
        --grey4: #515151;
        --grey5: #686868;
        --grey6: #7f7f7f;
        --grey7: #979797;
        --grey8: #aeaeae;
        --grey9: #c5c5c5;
        --grey10: #dcdcdc;
        --grey11: #e1e1e1;
        --grey12: #eaeaea;
        --grey13: #f9f9f9;
        --white: #fff;
        --red: #f02525;
    }
    
    /* Globals
    /* ----------------------------------------------------- */
    h1, h2, h3, h4, h5, h6, p {
        line-height: 1.15em;
        padding: 0;
        margin: 0;
    }

    h1 {
        font-size: 31px;
        font-weight: 500;
        letter-spacing: 0.2px;
    }

    h2 {
        font-size: 23px;
        font-weight: 500;
        letter-spacing: 0.2px;
    }

    h3 {
        font-size: 20px;
        font-weight: 500;
        letter-spacing: 0.2px;
    }

    p {
        font-size: 15px;
        line-height: 1.55em;
        margin-bottom: 24px;
    }

    strong {
        font-weight: 600;
    }
    
    a,
    .gh-portal-link {
        cursor: pointer;
    }

    .gh-portal-main-title {
        color: var(--grey1);
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
        border: none;
        min-width: 80px;
        height: 42px;
        padding: 0 1.8rem;
        border-radius: 4px;
        cursor: pointer;
        transition: .4s ease;
        box-shadow: none;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.08), 0 2px 6px -3px rgba(0,0,0,0.19);
        user-select: none;
    }

    .gh-portal-btn:hover {
        box-shadow: 0 0 0 1px rgba(0,0,0,0.18), 0 2px 6px -3px rgba(0,0,0,0.19);
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
    }

    .gh-portal-btn-list:hover {
        box-shadow: none;
        opacity: 0.75;
    }

    .gh-portal-btn-logout {
        position: absolute;
        top: 15px;
        left: 16px;
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

    /* Global layout styles
    /* ----------------------------------------------------- */
    .gh-portal-popup-background {
        position: absolute;
        display: block;
        content: "";
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        background: rgba(0,0,0,0.2);
        padding-top: 100px;
        animation: fadein 0.2s;
    }

    .gh-portal-popup-background.preview {
        background: #EDF0F2;
        animation: none;
    }

    @keyframes fadein {
        0% { opacity: 0; }
        100%{ opacity: 1.0; }
    }

    .gh-portal-popup-container {
        position: relative;
        display: flex;
        box-sizing: border-box;
        top: 100px;
        flex-direction: column;
        justify-content: flex-start;
        overflow: hidden;
        font-size: 1.5rem;
        text-align: left;
        letter-spacing: 0;
        text-rendering: optimizeLegibility;
        background: var(--white);
        width: 440px;
        padding: 32px;
        margin: 0 auto;
        border-radius: 5px;
        box-shadow: 0 3.8px 2.2px rgba(0, 0, 0, 0.028), 0 9.2px 5.3px rgba(0, 0, 0, 0.04), 0 17.3px 10px rgba(0, 0, 0, 0.05), 0 30.8px 17.9px rgba(0, 0, 0, 0.06), 0 57.7px 33.4px rgba(0, 0, 0, 0.072), 0 138px 80px rgba(0, 0, 0, 0.1);
        animation: popup 0.25s;
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

    .gh-portal-closeicon-container {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 999;
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
        justify-content: flex-start;
        margin: 0 0 20px;
    }

    .gh-portal-detail-header .gh-portal-btn-back,
    .gh-portal-detail-header .gh-portal-btn-back:hover {        
        position: absolute;
        top: -10px;
        left: 0;
        background: none;
        padding: 0;
        margin: 0;
        box-shadow: none;
    }

    .gh-portal-detail-footer .gh-portal-btn {
        min-width: 90px;
    }

    .gh-portal-action-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-grow: 1;
    }

    .gh-portal-list {
        background: var(--white);
        padding: 20px;
        border-radius: 3px;
        box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.07), 0px 1px 1.5px 0px rgba(0, 0, 0, 0.05);
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
        line-height: 1.15em;
        padding: 0;
        margin: 2px 0 0;
        color: var(--grey6);
    }

    /* Icons
    /* ----------------------------------------------------- */
    .gh-portal-icon {
        color: var(--brandcolor);
    }

    /* Links
    /* ----------------------------------------------------- */

`;

// Append all styles as string which we want to pass to iframe
const FrameStyle = 
    GlobalStyles +
    AccountHomePageStyles +
    AccountPlanPageStyles +
    InputFieldStyles +
    PlanSectionStyles +
    SwitchStyles + 
    ActionButtonStyles +
    AvatarStyles +
    MagicLinkStyles +
    LinkPageStyles +
    SignupPageStyles;

export default FrameStyle;