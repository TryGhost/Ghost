import React from 'react';

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
