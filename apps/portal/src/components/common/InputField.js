import {useEffect, useRef} from 'react';
import {hasMode} from '../../utils/check-mode';
import {isCookiesDisabled} from '../../utils/helpers';

export const InputFieldStyles = `
    .gh-portal-input-section.hidden {
        display: none;
    }
    .gh-portal-input {
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;

        display: block;
        box-sizing: border-box;
        font-size: 1.5rem;
        color: inherit;
        background: transparent;
        outline: none;
        border: 1px solid var(--grey11);
        border-radius: 6px;
        width: 100%;
        height: 44px;
        padding: 0 12px;
        margin-bottom: 18px;
        letter-spacing: 0.2px;
        transition: border-color 0.25s ease-in-out;
    }

    .gh-portal-input-labelcontainer {
        display: flex;
        justify-content: space-between;
        width: 100%;
    }

    .gh-portal-input-labelcontainer p {
        color: var(--red);
        font-size: 1.3rem;
        letter-spacing: 0.35px;
        line-height: 1.6em;
        margin-bottom: 0;
    }

    .gh-portal-input-label.hidden {
        display: none;
    }

    .gh-portal-input:focus {
        border-color: var(--grey8);
    }

    .gh-portal-input.error {
        border-color: var(--red);
    }

    .gh-portal-input::placeholder {
        color: var(--grey8);
    }

    .gh-portal-popup-container:not(.preview) .gh-portal-input:disabled {
        background: var(--grey13);
        color: var(--grey9);
        box-shadow: none;
    }

    .gh-portal-popup-container:not(.preview) .gh-portal-input:disabled::placeholder {
        color: var(--grey9);
    }
`;

function InputError({message, style}) {
    if (!message) {
        return null;
    }
    return (
        <p style={{
            ...(style || {})
        }}>
            {message}
        </p>
    );
}

function InputField({
    name,
    id,
    hidden,
    label,
    hideLabel,
    type,
    value,
    placeholder,
    disabled = false,
    onChange = () => {},
    onBlur = () => {},
    onKeyDown = () => {},
    tabindex,
    maxlength,
    autoFocus,
    errorMessage
}) {
    const fieldNode = useRef(null);
    id = id || `input-${name}`;
    const sectionClasses = hidden ? 'gh-portal-input-section hidden' : 'gh-portal-input-section';
    const labelClasses = hideLabel ? 'gh-portal-input-label hidden' : 'gh-portal-input-label';
    const inputClasses = errorMessage ? 'gh-portal-input error' : 'gh-portal-input';
    if (isCookiesDisabled()) {
        disabled = true;
    }

    // Disable all input fields in preview mode
    if (hasMode(['preview'])) {
        disabled = true;
    }

    let autocomplete = '';
    let autocorrect = '';
    let autocapitalize = '';
    switch (id) {
    case 'input-email':
        autocomplete = 'off';
        autocorrect = 'off';
        autocapitalize = 'off';
        break;
    case 'input-name':
        autocomplete = 'off';
        autocorrect = 'off';
        break;
    default:
        break;
    }
    useEffect(() => {
        if (autoFocus) {
            fieldNode.current.focus();
        }
    }, [autoFocus]);
    return (
        <section className={sectionClasses}>
            <div className='gh-portal-input-labelcontainer'>
                <label htmlFor={id} className={labelClasses}> {label} </label>
                <InputError message={errorMessage} name={name} />
            </div>
            <input
                data-test-input={id}
                ref={fieldNode}
                id={id}
                className={inputClasses}
                type={type}
                name={name}
                value={value}
                placeholder={placeholder}
                onChange={e => onChange(e, name)}
                onKeyDown={e => onKeyDown(e, name)}
                onBlur={e => onBlur(e, name)}
                disabled={disabled}
                tabIndex={tabindex}
                maxLength={maxlength}
                autoComplete={autocomplete}
                autoCorrect={autocorrect}
                autoCapitalize={autocapitalize}
                aria-label={label}
            />
        </section>
    );
}

export default InputField;
