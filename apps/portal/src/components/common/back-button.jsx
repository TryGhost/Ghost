import LeftArrowIcon from '../../images/icons/arrow-left.svg?react';
import { t } from '../../utils/i18n';

function ActionButton({ brandColor, label = null, hidden = false, onClick }) {
  if (hidden) {
    return null;
  }

  if (label === null) {
    label = t('Back');
  }

  return (
    <button
      className="gh-portal-btn-back fixed top-[29px] left-5 z-[10000] m-0 flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-2 text-center text-15 leading-none font-medium tracking-[0.2px] whitespace-nowrap text-gray-900 no-underline transition-all duration-[250ms] ease-[ease] outline-none select-none hover:-translate-x-1 hover:text-gray-950 max-sm:left-4 rtl:right-5 rtl:left-auto max-sm:rtl:right-4"
      style={brandColor ? { color: brandColor } : undefined}
      onClick={(e) => onClick(e)}
    >
      <LeftArrowIcon className="me-0.5 mt-px size-[17px] rtl:-scale-x-100" /> {label}
    </button>
  );
}

export default ActionButton;
