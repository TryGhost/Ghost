import LeftArrowIcon from '../../images/icons/arrow-left.svg?react';
import clsx from 'clsx';
import { t } from '../../utils/i18n';
import { tw } from '../../utils/tw';

const PLACEMENTS = {
  popup: tw`left-5 max-sm:left-4 rtl:right-5 rtl:left-auto max-sm:rtl:right-4`,
  longform: tw`left-[calc(6vmin-14px)] max-sm:left-4 rtl:right-[calc(6vmin-14px)] rtl:left-auto`,
};

function ActionButton({ brandColor, label = null, hidden = false, onClick, placement = 'popup' }) {
  if (hidden) {
    return null;
  }

  if (label === null) {
    label = t('Back');
  }

  return (
    <button
      className={clsx(
        'fixed top-[29px] z-[10000] m-0 flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-2 text-center text-15 leading-none font-medium tracking-[0.2px] whitespace-nowrap text-gray-800 no-underline transition-all duration-[250ms] ease-[ease] outline-none select-none hover:-translate-x-1 hover:text-gray-900',
        PLACEMENTS[placement],
      )}
      style={brandColor ? { color: brandColor } : undefined}
      onClick={(e) => onClick(e)}
    >
      <LeftArrowIcon className="me-0.5 mt-px size-[17px] rtl:-scale-x-100" /> {label}
    </button>
  );
}

export default ActionButton;
