import CheckmarkIcon from '../../images/icons/checkmark.svg?react';
import { t } from '../../utils/i18n';
import { tw } from '../../utils/tw';

const ChevronIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const GiftDetailsToggle = ({ description, benefits, showDetails, onToggle }) => {
  const visibleBenefits = (benefits || [])
    .map((benefit, index) => {
      const benefitName = typeof benefit === 'string' ? benefit : benefit?.name;
      const benefitKey =
        typeof benefit === 'string' ? benefit : benefit?.id || `gift-benefit-${index}`;

      if (!benefitName) {
        return null;
      }

      return (
        <div
          className="gh-portal-gift-checkout-benefit flex items-start gap-2.5 text-14.5 leading-[1.4] text-white/85"
          key={benefitKey}
        >
          <CheckmarkIcon
            aria-hidden="true"
            className="mt-[3px] size-[14px] shrink-0 text-gray-950 [&_path]:stroke-white/85"
            focusable="false"
          />
          <span>{benefitName}</span>
        </div>
      );
    })
    .filter(Boolean);

  if (!description && visibleBenefits.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className="grid w-full grid-rows-[0fr] [transition:grid-template-rows_0.3s_ease,margin-top_0.3s_ease] data-[open=true]:mt-8 data-[open=true]:grid-rows-[1fr]"
        data-open={showDetails}
        aria-hidden={!showDetails}
      >
        <div className="min-h-0 overflow-hidden">
          {description && (
            <p className="mb-3 text-14.5 leading-[1.4] text-white/85 last:mb-0">{description}</p>
          )}
          {visibleBenefits.length > 0 && (
            <div className="flex flex-col gap-2">{visibleBenefits}</div>
          )}
        </div>
      </div>
      <button
        type="button"
        className={
          tw`mt-6 inline-flex cursor-pointer items-center gap-1 border-none bg-transparent px-3 py-2 text-14 font-medium text-white/70 [transition:color_0.15s_ease] hover:text-white/95 focus-visible:[outline:2px_solid_rgba(255,255,255,0.9)] focus-visible:outline-offset-[3px] [&_svg]:size-3 [&_svg]:[transition:transform_0.2s_ease] [&.is-open_svg]:[transform:rotate(-180deg)]` +
          (showDetails ? ' is-open' : '')
        }
        onClick={onToggle}
        aria-expanded={showDetails}
      >
        {showDetails ? t('Hide details') : t('Gift details')}
        <ChevronIcon />
      </button>
    </>
  );
};

export default GiftDetailsToggle;
