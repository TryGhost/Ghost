import { useEffect, useRef } from 'react';
import { hasMode } from '../../utils/check-mode';
import { isCookiesDisabled } from '../../utils/helpers';
import { t } from '../../utils/i18n';
import { tw } from '../../utils/tw';
import { inputLabelContainerClass } from '../shared-classes';

function InputError({ message, style }) {
  if (!message) {
    return null;
  }
  return (
    <p
      className="mb-0 text-13 leading-[1.6em] tracking-[0.35px] text-red"
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
  options,
  onChange = () => {},
  onBlur = () => {},
  onKeyDown = () => {},
  tabIndex,
  maxLength,
  autoFocus,
  errorMessage,
  // Marked wrong without saying why here. A composite's inputs share one field, and its
  // reasons are listed under the group rather than wedged between its rows.
  invalid = false,
  // What says why, when it is not printed beside the input: a composite's reasons are
  // listed under the group, and an input has to point at them to be read out with it.
  describedBy,
}) {
  const fieldNode = useRef(null);
  id = id || `input-${name}`;
  const sectionClasses = hidden ? 'gh-portal-input-section hidden' : 'gh-portal-input-section';
  const labelClasses =
    (hideLabel ? 'gh-portal-input-label hidden' : 'gh-portal-input-label') +
    tw` mb-0.5 text-13 font-semibold tracking-[0px] text-gray-950`;
  const inputClasses = errorMessage || invalid ? 'gh-portal-input error' : 'gh-portal-input';
  const fieldClasses = tw`mb-4 block w-full appearance-none rounded-md border border-solid border-gray-300 bg-transparent px-3 text-15 tracking-[0.2px] [color:inherit] outline-none [-webkit-appearance:none] transition-input placeholder:text-gray-500 focus:border-gray-500 group-[:not(.preview)]/popup:disabled:bg-gray-50 group-[:not(.preview)]/popup:disabled:text-gray-400 group-[:not(.preview)]/popup:disabled:placeholder:text-gray-400 aria-[invalid=true]:border-red group-[:not(.preview)]/popup:[&[readonly]]:bg-gray-50 group-[:not(.preview)]/popup:[&[readonly]]:text-gray-400 group-[:not(.preview)]/popup:[&[readonly]::placeholder]:text-gray-400`;
  const inputHeightClasses = 'h-11 py-0 max-xl:h-10.5';
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
    className: `${inputClasses} ${fieldClasses} ${inputHeightClasses}`,
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
    'aria-invalid': errorMessage || invalid ? true : undefined,
    'aria-describedby': describedBy,
  };
  return (
    <section className={sectionClasses}>
      <div className={inputLabelContainerClass}>
        <label htmlFor={id} className={labelClasses}>
          {' '}
          {label}{' '}
        </label>
        <InputError message={errorMessage} name={name} />
      </div>
      {type === 'textarea' ? (
        // No onKeyDown: Enter adds a line here, where in an input it submits the form.
        <textarea
          {...fieldProps}
          className={`${inputClasses} gh-portal-input-textarea ${fieldClasses} h-auto min-h-22 resize-y py-2.5 leading-[1.4em]`}
        />
      ) : type === 'select' ? (
        // A select cannot be read-only, so a value the member may not change is disabled
        // instead. The empty option stands for no value: with nothing chosen it carries
        // the placeholder, since the closed control can only show an option's text, and
        // is not a choice, so it is hidden from the list where the browser allows
        // (Safari ignores `hidden` on an option and shows it greyed and unselectable
        // instead). Once something is chosen it is offered as the way to clear it,
        // parenthesised the way lists mark the row that is not one of the values, since
        // an option's text is all a native list can style across browsers.
        <select
          {...fieldProps}
          className={`${value ? inputClasses : `${inputClasses} placeholder`} ${fieldClasses} ${inputHeightClasses} cursor-pointer bg-select-chevron [background-position:right_12px_center] bg-no-repeat pe-9 rtl:[background-position:left_12px_center] [&_option]:[color:CanvasText] [&.placeholder]:text-gray-500`}
          disabled={disabled || readOnly}
        >
          {value ? (
            <option value="">{t('(None)')}</option>
          ) : (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {(options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
