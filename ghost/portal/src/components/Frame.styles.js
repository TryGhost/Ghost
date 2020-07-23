/** By default, CRAs webpack bundle combines and appends the main css at root level, so they are not applied inside iframe
 * This uses a hack where we append `<style> </style>` tag with all CSS inside the head of iframe dynamically, thus making it available easily
 * We can create separate variables to keep styles grouped logically, and export them as one appeneded string
*/

import {ActionButtonStyles} from './common/ActionButton';
import {SwitchStyles} from './common/Switch';
import {AccountHomePageStyles} from './pages/AccountHomePage';
import {InputFieldStyles} from './common/InputField';
import {SignupPageStyles} from './pages/SignupPage';
import {PlanSectionStyles} from './common/PlansSection';
import {AvatarStyles} from './common/MemberGravatar';

// Global styles
export const GlobalStyles = `
    
    /* Layout utilities
    /* ----------------------------------------------------- */
    .flex { display: flex; }
    .inline-flex { display: inline-flex; }
    
    .flex-auto {
        flex: 1 1 auto;
        min-width: 0; /* 1 */
        min-height: 0; /* 1 */
    }
    
    .flex-none { flex: none; }
    
    .flex-column  { flex-direction: column; }
    .flex-row     { flex-direction: row; }
    .flex-wrap    { flex-wrap: wrap; }
    .flex-nowrap    { flex-wrap: nowrap; }
    .flex-wrap-reverse    { flex-wrap: wrap-reverse; }
    .flex-column-reverse  { flex-direction: column-reverse; }
    .flex-row-reverse     { flex-direction: row-reverse; }
    
    .items-start    { align-items: flex-start; }
    .items-end      { align-items: flex-end; }
    .items-center   { align-items: center; }
    .items-baseline { align-items: baseline; }
    .items-stretch  { align-items: stretch; }
    
    .self-start    { align-self: flex-start; }
    .self-end      { align-self: flex-end; }
    .self-center   { align-self: center; }
    .self-baseline { align-self: baseline; }
    .self-stretch  { align-self: stretch; }
    
    .justify-start   { justify-content: flex-start; }
    .justify-end     { justify-content: flex-end; }
    .justify-center  { justify-content: center; }
    .justify-between { justify-content: space-between; }
    .justify-around  { justify-content: space-around; }
    
    .content-start   { align-content: flex-start; }
    .content-end     { align-content: flex-end; }
    .content-center  { align-content: center; }
    .content-between { align-content: space-between; }
    .content-around  { align-content: space-around; }
    .content-stretch { align-content: stretch; }
    
    .order-0 { order: 0; }
    .order-1 { order: 1; }
    .order-2 { order: 2; }
    .order-3 { order: 3; }
    .order-4 { order: 4; }
    .order-5 { order: 5; }
    .order-6 { order: 6; }
    .order-7 { order: 7; }
    .order-8 { order: 8; }
    .order-last { order: 99999; }
    
    .flex-grow-0 { flex-grow: 0; }
    .flex-grow-1 { flex-grow: 1; }
    
    .flex-shrink-0 { flex-shrink: 0; }
    .flex-shrink-1 { flex-shrink: 1; }

    .static { position: static; }
    .relative  { position: relative; }
    .absolute  { position: absolute; }
    .fixed  { position: fixed; }
    .sticky  { position: sticky; }

    .ma0 { margin: 0; }
    .mt0 { margin-top: 0; }
    .mr0 { margin-right: 0; }
    .mb0 { margin-bottom: 0; }
    .ml0 { margin-left: 0; }
    .mh0 { margin-left: 0; margin-right: 0; }
    .mv0 { margin-top: 0; margin-bottom: 0; }

    .pa0 { padding: 0; }
    .pt0 { padding-top: 0; }
    .pr0 { padding-right: 0; }
    .pb0 { padding-bottom: 0; }
    .pl0 { padding-left: 0; }
    .ph0 { padding-left: 0; padding-right: 0; }
    .pv0 { padding-top: 0; padding-bottom: 0; }

    /* Typography
    /* ----------------------------------------------------- */
    h1, h2, h3, h4, h5, h6, p {
        padding: 0;
        margin: 0;
        line-height: 1.15em;
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
        color: #333;
    }

    .gh-portal-text-disabled {
        color: #484848;
        opacity: 0.35;
        font-weight: normal;
    }

    .gh-portal-text-center {
        text-align: center;
    }

    .gh-portal-setting-heading {
        font-size: 1.3rem;
        margin-bottom: 2px;
        font-weight: 500;
        color: #333;
        letter-spacing: 0.35px;
    }

    .gh-portal-setting-data {
        font-size: 1.3rem;
        color: #7f7f7f;
        line-height: 1.15em;
    }

    /* Buttons
    /* ----------------------------------------------------- */
    .gh-portal-btn {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 1.8rem;
        height: 42px;
        border: none;
        font-size: 1.4rem;
        line-height: 1em;
        font-weight: 500;
        letter-spacing: 0.2px;
        text-align: center;
        text-decoration: none;
        white-space: nowrap;
        border-radius: 4px;
        cursor: pointer;
        transition: .4s ease;
        box-shadow: none;
        user-select: none;
        background: #fff;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.08), 0 2px 6px -3px rgba(0,0,0,0.19);
        color: #212121;
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
        background: none;
        padding: 0;
        line-height: 1;
        height: unset;
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

    /* Global layout styles
    /* ----------------------------------------------------- */
    .gh-portal-popup-container {
        width: 100%;
        letter-spacing: 0;
        text-rendering: optimizeLegibility;
        font-size: 1.5rem;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        top: 0px;
        bottom: 0px;
        left: 0px;
        right: 0px;
        overflow: hidden;
        padding: 32px;
        padding-bottom: 32px;
        text-align: left;
        box-sizing: border-box;
        position: relative;
    }

    .gh-portal-closeicon-container {
        position: absolute;
        top: 8px;
        right: 8px;
    }

    .gh-portal-closeicon {
        width: 16px;
        height: 16px;
        color: #dcdcdc;
        cursor: pointer;
        padding: 12px;
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
        box-shadow: none;
        padding: 0;
        margin: 0;
    }

    .gh-portal-detail-footer .gh-portal-btn {
        min-width: 90px;
    }

    /* Lists */
    .gh-portal-list {
        background: #fff;
        box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.07), 0px 1px 1.5px 0px rgba(0, 0, 0, 0.05);
        border-radius: 3px;
        padding: 20px;
    }

    .gh-portal-list section {
        display: flex;
        align-items: center;
        margin: 0 -20px 20px;
        padding: 0 20px 20px;
        border-bottom: 1px solid #eaeaea;
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
        color: #7f7f7f;
    }

    .gh-portal-btn-list {
        height: 38px;
        font-size: 1.4rem;
        width: unset;
        padding: 0 4px;
        margin: 0 -4px;
        box-shadow: none;
        color: var(--brandcolor);
    }

    .gh-portal-btn-list:hover {
        box-shadow: none;
        opacity: 0.75;
    }
`;

// Append all styles as string which we want to pass to iframe
const FrameStyle = 
    GlobalStyles +
    AccountHomePageStyles +
    InputFieldStyles +
    PlanSectionStyles +
    SwitchStyles + 
    ActionButtonStyles +
    AvatarStyles +
    SignupPageStyles;

export default FrameStyle;