/** By default, CRAs webpack bundle combines and appends the main css at root level, so they are not applied inside iframe
 * This uses a hack where we append `<style> </style>` tag with all CSS inside the head of iframe dynamically, thus making it available easily
 * We can create separate variables to keep styles grouped logically, and export them as one appeneded string
*/

export const SwitchStyle = `
/* Switch
/* ---------------------------------------------------------- */
.for-switch label,
.for-switch .container {
    cursor: pointer;
    position: relative;
    display: inline-block;
    width: 50px !important;
    height: 28px !important;
}

.for-switch label p,
.for-switch .container p {
    overflow: auto;
    color: #15171A;
    font-weight: normal;
}

.for-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.for-switch .input-toggle-component {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #e5eff5;
    border: 1px solid #dae8f1;
    transition: .3s;
    width: 50px !important;
    height: 28px !important;
    border-radius: 999px;
    transition: background 0.15s ease-in-out, border-color 0.15s ease-in-out;
}

.for-switch label:hover input:not(:checked) + .input-toggle-component,
.for-switch .container:hover input:not(:checked) + .input-toggle-component {
    border-color: #c5d7e2;
}

.for-switch .input-toggle-component:before {
    position: absolute;
    content: "";
    height: 22px !important;
    width: 22px !important;
    left: 2px !important;
    top: 2px !important;
    background-color: white;
    transition: .3s;
    box-shadow: 0 0 1px rgba(0,0,0,.6), 0 2px 3px rgba(0,0,0,.2);
    border-radius: 999px;
}

.for-switch input:checked + .input-toggle-component {
    background: #a4d037;
    border-color: transparent;
}

.for-switch input:checked + .input-toggle-component:before {
    transform: translateX(22px);
}

.for-switch .container {
    width: 38px !important;
    height: 22px !important;
}

.for-switch.small .input-toggle-component {
    width: 38px !important;
    height: 22px !important;
}

.for-switch.small .input-toggle-component:before {
    height: 16px !important;
    width: 16px !important;
    box-shadow: 0 0 1px rgba(0,0,0,.45), 0 1px 2px rgba(0,0,0,.1);
}

.for-switch.small input:checked + .input-toggle-component:before {
    transform: translateX(16px);
}
`;

export const ButtonStyles = `
.gh-portal-btn {
    position: relative;
    display: inline-block;
    padding: 0 1.8rem;
    height: 44px;
    border: 0;
    font-size: 1.5rem;
    line-height: 42px;
    font-weight: 500;
    letter-spacing: 0.2px;
    text-align: center;
    text-decoration: none;
    white-space: nowrap;
    border-radius: 5px;
    cursor: pointer;
    transition: .4s ease;
    box-shadow: none;
    user-select: none;
    width: 100%;
}

.gh-portal-btn:hover::before {
    position: absolute;
    content: "";
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 5px;
}
`;

// Append all styles as string which we want to pass to iframe
const FrameStyle = SwitchStyle + ButtonStyles;

export default FrameStyle;