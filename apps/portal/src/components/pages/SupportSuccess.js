import {useContext} from 'react';
import AppContext from '../../AppContext';
import {ReactComponent as ConfettiIcon} from '../../images/icons/confetti.svg';
import CloseButton from '../common/CloseButton';
import ActionButton from '../common/ActionButton';

export const TipsAndDonationsSuccessStyle = `
    .gh-portal-tips-and-donations .gh-tips-and-donations-icon-success {
        padding: 10px 0;
        text-align: center;
        color: var(--brandcolor);
        width: 48px;
        margin: 0 auto;
    }

    .gh-portal-tips-and-donations .gh-portal-text-center {
        padding: 16px 32px 12px;
    }
`;

const SupportSuccess = () => {
    const {onAction, brandColor, site, t} = useContext(AppContext);
    const successTitle = t('Thank you for your support');
    const successDescription = t('To continue to stay up to date, subscribe to {{publication}} below.', {publication: site?.title});
    const buttonLabel = t('Sign up');

    return (
        <div className='gh-portal-content gh-portal-tips-and-donations'>
            <CloseButton />

            <div className="gh-tips-and-donations-icon-success">
                {site.icon ? <img src={site.icon} alt={site.title} /> : <ConfettiIcon />}
            </div>
            <h1 className="gh-portal-main-title">{successTitle}</h1>
            <p className="gh-portal-text-center">{successDescription}</p>

            <ActionButton
                style={{width: '100%'}}
                retry={false}
                onClick = {() => onAction('switchPage', {page: 'signup'})}
                disabled={false}
                brandColor={brandColor}
                label={buttonLabel}
                isRunning={false}
                tabindex='3'
                classes={'sticky bottom'}
            />

            <div className="gh-portal-signup-message">
                <div>{t('Already a member?')}</div>
                <button
                    data-test-button='signin-switch'
                    className='gh-portal-btn gh-portal-btn-link'
                    style={{color: brandColor}}
                    onClick={() => onAction('switchPage', {page: 'signin'})}
                >
                    <span>{t('Sign in')}</span>
                </button>
            </div>
        </div>
    );
};

export default SupportSuccess;
