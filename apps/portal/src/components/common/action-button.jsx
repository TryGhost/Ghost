import LoaderIcon from '../../images/icons/loader.svg?react';
import { isCookiesDisabled } from '../../utils/helpers';

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
  classes = '',
  style = {},
  tabIndex = undefined,
  dataTestId,
}) {
  const Style = Styles({ disabled, retry, brandColor, style, isPrimary });

  const isText = classes.split(' ').includes('gh-portal-btn-text');

  let className = 'gh-portal-btn';
  if (isPrimary) {
    className += ' gh-portal-btn-main gh-portal-btn-primary';
  }
  if (isDestructive) {
    className += ' gh-portal-btn-destructive';
  }
  if (classes) {
    className += ' ' + classes;
  }

  className +=
    ' relative flex min-w-[80px] cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-md bg-white text-center text-base font-medium leading-[1em] tracking-[0.2px] no-underline [outline:none] [transition:all_.25s_ease] disabled:cursor-auto disabled:!opacity-50';
  className += isText ? ' h-auto p-0' : ' h-11 px-[1.8rem] py-0';
  if (isPrimary) {
    className +=
      ' border-none text-white hover:!opacity-[0.92] focus:!opacity-[0.92] disabled:hover:!opacity-[0.92] disabled:focus:!opacity-[0.92] max-[1440px]:h-[42px]';
  } else {
    className += isText
      ? ' border-none text-grey-0'
      : ' border border-solid border-grey-12 text-grey-0 hover:border-grey-10';
    if (!isDestructive && !classes) {
      // Legacy `button[class="gh-portal-btn"]` rule only matched the bare class
      className += ' max-[1440px]:h-[42px]';
    }
  }
  if (isDestructive) {
    className += ' enabled:hover:border-red enabled:hover:text-red';
  }
  if (isCookiesDisabled()) {
    disabled = true;
  }
  const loaderClassName = isPrimary
    ? 'gh-portal-loadingicon absolute left-1/2 ms-[-19px] inline-block h-[31px] [&_path]:fill-white [&_rect]:fill-white'
    : 'gh-portal-loadingicon dark absolute left-1/2 ms-[-19px] inline-block h-[31px] [&_path]:fill-grey-0 [&_rect]:fill-grey-0';
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
