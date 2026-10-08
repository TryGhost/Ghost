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
      className="gh-portal-btn-back fixed left-5 top-[29px] z-[10000] m-0 flex cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-md border-none bg-transparent p-2 text-center text-base font-medium leading-none tracking-[0.2px] text-grey-3 no-underline outline-none transition-all duration-[250ms] ease-[ease] hover:-translate-x-1 hover:text-grey-1 max-sm:left-4 rtl:left-auto rtl:right-5 max-sm:rtl:right-4"
      style={brandColor ? { color: brandColor } : undefined}
      onClick={(e) => onClick(e)}
    >
      <LeftArrowIcon className="me-0.5 mt-px h-[17px] w-[17px] rtl:-scale-x-100" /> {label}
    </button>
  );
}

export default ActionButton;
