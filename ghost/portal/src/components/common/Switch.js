import React from 'react';

export const SwitchStyles = `
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

function Switch({id, label, onToggle, checked = false}) {
    return (
        <div className="for-switch">
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
