import { useEffect, useRef, useState } from 'react';

function Switch({
  id,
  label = '',
  onToggle,
  checked = false,
  disabled = false,
  dataTestId = 'switch-input',
  presentational = false,
}) {
  const [isChecked, setIsChecked] = useState(checked);

  useEffect(() => {
    setIsChecked(checked);
  }, [checked]);

  const inputRef = useRef(null);
  useEffect(() => {
    if (inputRef.current && inputRef.current.checked !== isChecked) {
      inputRef.current.checked = isChecked;
    }
  }, [isChecked, id]);

  const handleChange = (event) => {
    if (disabled) {
      return;
    }

    setIsChecked(event.target.checked);
    onToggle(event, event.target.checked);
  };

  // When `presentational` is true, the surrounding row is the accessible
  // control (it carries role="button" + aria-pressed). The whole switch is
  // hidden from the accessibility tree and the checkbox is removed from the
  // focus order so keyboard/SR users get a single stop with the correct
  // toggle state.
  const wrapperProps = presentational ? { 'aria-hidden': true } : {};
  const inputProps = presentational ? { tabIndex: -1 } : { 'aria-label': label };

  return (
    <div className="gh-portal-for-switch" data-test-switch={dataTestId} {...wrapperProps}>
      <label className="switch relative inline-block h-[26px]! w-11! cursor-pointer" htmlFor={id}>
        <input
          ref={inputRef}
          className="peer/switch size-0 opacity-0"
          type="checkbox"
          checked={isChecked}
          disabled={disabled}
          id={id}
          onChange={handleChange}
          {...inputProps}
        />
        <span
          className="absolute inset-0 h-[26px]! w-11! cursor-pointer rounded-[999px] bg-gray-200 [transition:background_0.15s_ease-in-out,border-color_0.15s_ease-in-out] peer-checked/switch:bg-brand before:absolute before:top-[3px]! before:left-[3px]! before:size-5! before:rounded-[999px] before:bg-white before:content-[''] before:[transition:0.3s] peer-checked/switch:before:translate-x-[18px] rtl:before:right-[3px]! rtl:before:left-auto! rtl:peer-checked/switch:before:translate-x-[-18px]"
          data-testid={dataTestId}
        ></span>
      </label>
    </div>
  );
}

export default Switch;
