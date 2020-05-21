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
                }}></span>
            </label>
        </div>
    );
}

export default Switch;
