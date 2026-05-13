import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark.svg';
import {t} from '../../utils/i18n';

const ChevronIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="6 9 12 15 18 9"/>
    </svg>
);

const GiftDetailsToggle = ({description, benefits, showDetails, onToggle}) => {
    const visibleBenefits = (benefits || [])
        .map((benefit, index) => {
            const benefitName = typeof benefit === 'string' ? benefit : benefit?.name;
            const benefitKey = typeof benefit === 'string' ? benefit : benefit?.id || `gift-benefit-${index}`;

            if (!benefitName) {
                return null;
            }

            return (
                <div className='gh-portal-gift-checkout-benefit' key={benefitKey}>
                    <CheckmarkIcon aria-hidden='true' focusable='false' />
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
                className='gh-portal-gift-checkout-details'
                data-open={showDetails}
                aria-hidden={!showDetails}
            >
                <div className='gh-portal-gift-checkout-details-inner'>
                    {description && (
                        <p className='gh-portal-gift-checkout-details-description'>{description}</p>
                    )}
                    {visibleBenefits.length > 0 && (
                        <div className='gh-portal-gift-checkout-benefits'>
                            {visibleBenefits}
                        </div>
                    )}
                </div>
            </div>
            <button
                type='button'
                className={'gh-portal-gift-checkout-details-toggle' + (showDetails ? ' is-open' : '')}
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
