import { useEffect, useRef } from 'react';
import { hasMode } from '../../utils/check-mode';
import { isCookiesDisabled } from '../../utils/helpers';

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
        margin-bottom: 16px;
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

    /* Keyed on its own class rather than the element: the gift message and the
       cancellation reason are textareas with the base class too, and keep their look. */
    .gh-portal-input.gh-portal-input-textarea {
        height: auto;
        min-height: 88px;
        padding: 10px 12px;
        line-height: 1.4em;
        resize: vertical;
    }

    /* Several inputs presented as one field, the way an address is filled in at checkout.
       Neighbours overlap by a pixel so their borders read as one divider, and the focused
       or invalid input is lifted so its own border shows whole. */
    .gh-portal-input-group {
        margin-bottom: 16px;
    }

    .gh-portal-input-group .gh-portal-input {
        position: relative;
        border-radius: 0;
        margin-bottom: 0;
    }

    .gh-portal-input-group .gh-portal-input:focus,
    .gh-portal-input-group .gh-portal-input.error {
        z-index: 1;
    }

    .gh-portal-input-group-row {
        display: flex;
    }

    .gh-portal-input-group-row + .gh-portal-input-group-row {
        margin-top: -1px;
    }

    .gh-portal-input-group-row .gh-portal-input-section {
        flex: 1;
        min-width: 0;
    }

    .gh-portal-input-group-row .gh-portal-input-section + .gh-portal-input-section {
        margin-inline-start: -1px;
    }

    .gh-portal-input-group-row:first-child .gh-portal-input-section:first-child .gh-portal-input {
        border-start-start-radius: 6px;
    }

    .gh-portal-input-group-row:first-child .gh-portal-input-section:last-child .gh-portal-input {
        border-start-end-radius: 6px;
    }

    .gh-portal-input-group-row:last-child .gh-portal-input-section:first-child .gh-portal-input {
        border-end-start-radius: 6px;
    }

    .gh-portal-input-group-row:last-child .gh-portal-input-section:last-child .gh-portal-input {
        border-end-end-radius: 6px;
    }

    .gh-portal-input::placeholder {
        color: var(--grey8);
    }

    /* The attribute, not :read-only: a select counts as read-only to that pseudo-class
       and would take the disabled look while being perfectly usable. */
    .gh-portal-popup-container:not(.preview) .gh-portal-input:disabled,
    .gh-portal-popup-container:not(.preview) .gh-portal-input[readonly] {
        background: var(--grey13);
        color: var(--grey9);
        box-shadow: none;
    }

    .gh-portal-popup-container:not(.preview) .gh-portal-input:disabled::placeholder,
    .gh-portal-popup-container:not(.preview) .gh-portal-input[readonly]::placeholder {
        color: var(--grey9);
    }
`;

function InputError({ message, style }) {
  if (!message) {
    return null;
  }
  return (
    <p
      style={{
        ...(style || {}),
      }}
    >
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
  readOnly = false,
  onChange = () => {},
  onBlur = () => {},
  onKeyDown = () => {},
  tabIndex,
  maxLength,
  autoFocus,
  errorMessage,
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

  let autoComplete = '';
  let autoCorrect = '';
  let autoCapitalize = '';
  let inputMode;
  let pattern;
  switch (id) {
    case 'input-email':
      autoComplete = 'off';
      autoCorrect = 'off';
      autoCapitalize = 'off';
      break;
    case 'input-name':
      autoComplete = 'off';
      autoCorrect = 'off';
      break;
    case 'input-otc':
      autoComplete = 'one-time-code';
      autoCorrect = 'off';
      autoCapitalize = 'off';
      inputMode = 'numeric';
      pattern = '[0-9]*';
      placeholder ??= '• • • • • •';

      break;
    default:
      break;
  }
  useEffect(() => {
    if (autoFocus) {
      fieldNode.current.focus();
    }
  }, [autoFocus]);
  const fieldProps = {
    'data-test-input': id,
    ref: fieldNode,
    id,
    className: inputClasses,
    name,
    value,
    placeholder,
    onChange: (e) => onChange(e, name),
    onBlur: (e) => onBlur(e, name),
    disabled,
    readOnly,
    tabIndex,
    maxLength,
    'aria-label': label,
  };
  return (
    <section className={sectionClasses}>
      <div className="gh-portal-input-labelcontainer">
        <label htmlFor={id} className={labelClasses}>
          {' '}
          {label}{' '}
        </label>
        <InputError message={errorMessage} name={name} />
      </div>
      {type === 'textarea' ? (
        // No onKeyDown: Enter adds a line here, where in an input it submits the form.
        <textarea {...fieldProps} className={`${inputClasses} gh-portal-input-textarea`} />
      ) : (
        <input
          {...fieldProps}
          type={type}
          onKeyDown={(e) => onKeyDown(e, name)}
          autoComplete={autoComplete}
          autoCorrect={autoCorrect}
          autoCapitalize={autoCapitalize}
          inputMode={inputMode}
          pattern={pattern}
        />
      )}
    </section>
  );
}

export default InputField;
