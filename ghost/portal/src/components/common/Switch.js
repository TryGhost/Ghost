import React from 'react';

export const SwitchStyles = `
    .gh-portal-for-switch label,
    .gh-portal-for-switch .container {
        cursor: pointer;
        position: relative;
        display: inline-block;
        width: 36px !important;
        height: 22px !important;
    }

    .gh-portal-for-switch label p,
    .gh-portal-for-switch .container p {
        overflow: auto;
        color: #15171A;
        font-weight: normal;
    }

    .gh-portal-for-switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .gh-portal-for-switch .input-toggle-component {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #f8f8f8;
        border: 1px solid #e0e0e0;
        transition: .3s;
        width: 36px !important;
        height: 22px !important;
        border-radius: 999px;
        transition: background 0.15s ease-in-out, border-color 0.15s ease-in-out;
    }

    .gh-portal-for-switch label:hover input:not(:checked) + .input-toggle-component,
    .gh-portal-for-switch .container:hover input:not(:checked) + .input-toggle-component {
        border-color: #ccc;
    }

    .gh-portal-for-switch .input-toggle-component:before {
        position: absolute;
        content: "";
        height: 18px !important;
        width: 18px !important;
        left: 2px !important;
        top: 2px !important;
        background-color: white;
        transition: .3s;
        box-shadow: 0 0 1px rgba(0,0,0,.3), 0 4px 6px rgba(0,0,0,.1);
        border-radius: 999px;
    }

    .gh-portal-for-switch input:checked + .input-toggle-component {
        background: var(--brandcolor);
        border-color: transparent;
    }

    .gh-portal-for-switch input:checked + .input-toggle-component:before {
        transform: translateX(14px);
        box-shadow: none;
    }

    .gh-portal-for-switch .container {
        width: 38px !important;
        height: 22px !important;
    }
`;

function Switch({id, label, onToggle, checked = false}) {
    return (
        <div className="gh-portal-for-switch">
            <label className="switch" htmlFor={id}>
                <input
                    type="checkbox"
                    checked={checked}
                    id={id}
                    onChange={() => {}}
                    aria-label={label}
                />
                <span className="input-toggle-component" onClick={(e) => {
                    onToggle(e);
                }} data-testid="switch-input"></span>
            </label>
        </div>
    );
}

export default Switch;
