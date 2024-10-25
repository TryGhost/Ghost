import {useContext, useEffect, useState} from 'react';
import AppContext from '../../AppContext';

export const SwitchStyles = `
    .gh-portal-for-switch label,
    .gh-portal-for-switch .container {
        position: relative;
        display: inline-block;
        width: 44px !important;
        height: 26px !important;
        cursor: pointer;
    }

    .gh-portal-for-switch label p,
    .gh-portal-for-switch .container p {
        overflow: auto;
        color: var(--grey0);
        font-weight: normal;
    }

    .gh-portal-for-switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .gh-portal-for-switch .input-toggle-component {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--grey12);
        transition: .3s;
        width: 44px !important;
        height: 26px !important;
        border-radius: 999px;
        transition: background 0.15s ease-in-out, border-color 0.15s ease-in-out;
        cursor: pointer;
    }

    .gh-portal-for-switch label:hover input:not(:checked) + .input-toggle-component,
    .gh-portal-for-switch .container:hover input:not(:checked) + .input-toggle-component {
        border-color: var(--grey9);
    }

    .gh-portal-for-switch .input-toggle-component:before {
        position: absolute;
        content: "";
        top: 3px !important;
        left: 3px !important;
        height: 20px !important;
        width: 20px !important;
        background-color: var(--white);
        transition: .3s;
        border-radius: 999px;
    }
    html[dir="rtl"] .gh-portal-for-switch .input-toggle-component:before {
        left: unset !important;
        right: 3px !important;
    }

    .gh-portal-for-switch input:checked + .input-toggle-component {
        background: var(--brandcolor);
        border-color: transparent;
    }

    .gh-portal-for-switch input:checked + .input-toggle-component:before {
        transform: translateX(18px);
        box-shadow: none;
    }
    html[dir="rtl"] .gh-portal-for-switch input:checked + .input-toggle-component:before {
        transform: translateX(-18px);
    }

    .gh-portal-for-switch .container {
        width: 38px !important;
        height: 22px !important;
    }
`;

function Switch({id, label = '', onToggle, checked = false, dataTestId = 'switch-input'}) {
    const {action} = useContext(AppContext);
    const [isChecked, setIsChecked] = useState(checked);
    const isActionChanged = ['updateNewsletter:failed', 'updateNewsletter:success'].includes(action);
    useEffect(() => {
        setIsChecked(checked);
    }, [checked, isActionChanged]);
    return (
        <div className="gh-portal-for-switch" data-test-switch={dataTestId}>
            <label className="switch" htmlFor={id}>
                <input
                    type="checkbox"
                    checked={isChecked}
                    id={id}
                    onChange={() => {}}
                    aria-label={label}
                />
                <span className="input-toggle-component" onClick={(e) => {
                    setIsChecked(!isChecked);
                    onToggle(e, !isChecked);
                }} data-testid={dataTestId}></span>
            </label>
        </div>
    );
}

export default Switch;
