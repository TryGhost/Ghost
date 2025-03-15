import {useContext} from 'react';
import AppContext from '../../AppContext';
import {ReactComponent as ConfettiIcon} from '../../images/icons/confetti.svg';
import CloseButton from '../common/CloseButton';
import ActionButton from '../common/ActionButton';

export const TipsAndDonationsSuccessStyle = `
    .gh-portal-tips-and-donations .gh-portal-signup-header {
        margin-bottom: 12px;
        padding: 0;
    }

    .gh-portal-tips-and-donations .gh-tips-and-donations-icon-success {
        margin: 24px auto 16px;
        text-align: center;
        color: var(--brandcolor);
        width: 48px;
        height: 48px;
    }

    .gh-portal-tips-and-donations .gh-tips-and-donations-icon-success svg {
        width: 48px;
        height: 48px;
    }

    .gh-portal-tips-and-donations h1.gh-portal-main-title {
        font-size: 32px;
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

            <div className="gh-portal-signup-header">
                {site.icon ? <img className="gh-portal-signup-logo" src={site.icon} alt={site.title} /> : <div className="gh-tips-and-donations-icon-success"><ConfettiIcon /></div>}
                <h1 className="gh-portal-main-title">{successTitle}</h1>
            </div>
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
                    data-testid='signin-switch'
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
