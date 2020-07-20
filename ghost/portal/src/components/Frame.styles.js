/** By default, CRAs webpack bundle combines and appends the main css at root level, so they are not applied inside iframe
 * This uses a hack where we append `<style> </style>` tag with all CSS inside the head of iframe dynamically, thus making it available easily
 * We can create separate variables to keep styles grouped logically, and export them as one appeneded string
*/

import {ActionButtonStyles} from './common/ActionButton';
import {SwitchStyles} from './common/Switch';
import {AccountHomePageStyles} from './pages/AccountHomePage';

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

    /* Typography
    /* ----------------------------------------------------- */
    h1, h2, h3, h4, h5, h6 {
        padding: 0;
        margin: 0;
    }

    h1 {
        font-size: 31px;
        font-weight: 500;
        letter-spacing: 0.2px;
    }

    h2 {
        font-size: 24px;
        font-weight: 500;
        letter-spacing: 0.2px;
    }

    .gh-portal-main-title {
        color: #333;
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
        color: #999;
        cursor: pointer;
        padding: 12px;
    }

    .gh-portal-section {
        margin-bottom: 32px;
    }
`;

// Append all styles as string which we want to pass to iframe
const FrameStyle = 
    AccountHomePageStyles +
    GlobalStyles +
    SwitchStyles + 
    ActionButtonStyles;

export default FrameStyle;