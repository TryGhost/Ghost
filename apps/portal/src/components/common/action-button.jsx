import LoaderIcon from '../../images/icons/loader.svg?react';
import clsx from 'clsx';
import { isCookiesDisabled } from '../../utils/helpers';
import { tw } from '../../utils/tw';

const Styles = ({ brandColor, disabled, style = {}, isPrimary }) => {
  const backgroundColor = brandColor || '#3eb0ef';
  let opacity = '1.0';
  let pointerEvents = 'auto';

  if (disabled) {
    opacity = '0.5';
    pointerEvents = 'none';
  }

  return {
    button: {
      ...(isPrimary ? { backgroundColor } : {}),
      opacity,
      pointerEvents,
      ...(style || {}), // Override any custom style
    },
  };
};

function ActionButton({
  label,
  onClick,
  disabled = false,
  retry = false,
  brandColor,
  isRunning,
  isPrimary = true,
  isDestructive = false,
  isText = false,
  classes = '',
  style = {},
  tabIndex = undefined,
  dataTestId,
}) {
  const Style = Styles({ disabled, retry, brandColor, style, isPrimary });

  const className = clsx(
    'gh-portal-btn',
    isPrimary && 'gh-portal-btn-primary',
    classes,
    'relative flex min-w-[80px] cursor-pointer items-center justify-center rounded-md bg-white text-center text-15 leading-[1em] font-medium tracking-[0.2px] whitespace-nowrap no-underline outline-none select-none transition-control disabled:cursor-auto disabled:opacity-50!',
    isText ? 'h-auto p-0' : 'h-11 px-[1.8rem] py-0',
    isPrimary &&
      'border-none text-white hover:opacity-[0.92]! focus:opacity-[0.92]! disabled:hover:opacity-[0.92]! disabled:focus:opacity-[0.92]! max-[1441px]:h-[42px]',
    !isPrimary &&
      (isText
        ? 'border-none text-black'
        : 'border border-solid border-gray-200 text-black hover:border-gray-300'),
    // Only a plain secondary button (no extra classes) shrinks at 1440px
    !isPrimary && !isDestructive && !isText && !classes && 'max-[1441px]:h-[42px]',
    isDestructive && 'enabled:hover:border-red enabled:hover:text-red',
  );
  if (isCookiesDisabled()) {
    disabled = true;
  }
  const loaderClassName = isPrimary
    ? tw`gh-portal-loadingicon absolute left-1/2 ms-[-19px] inline-block h-[31px] [&_path]:fill-white [&_rect]:fill-white`
    : tw`gh-portal-loadingicon dark absolute left-1/2 ms-[-19px] inline-block h-[31px] [&_path]:fill-black [&_rect]:fill-black`;
  return (
    <button
      className={className}
      style={Style.button}
      onClick={(e) => onClick(e)}
      disabled={disabled}
      type="submit"
      tabIndex={tabIndex}
      data-test-button={dataTestId}
    >
      {isRunning ? <LoaderIcon className={loaderClassName} /> : label}
    </button>
  );
}

export default ActionButton;
