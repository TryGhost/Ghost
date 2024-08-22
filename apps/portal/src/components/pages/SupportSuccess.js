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
    const {onAction, brandColor, t} = useContext(AppContext);
    const successTitle = t('Thank you!');
    const successDescription = t('Your support means a lot.');
    const buttonLabel = t('Close');

    return (
        <div className='gh-portal-content gh-portal-tips-and-donations'>
            <CloseButton />

            <div className="gh-tips-and-donations-icon-success">
                <ConfettiIcon />
            </div>
            <h1 className="gh-portal-main-title">{successTitle}</h1>
            <p className="gh-portal-text-center">{successDescription}</p>
            <ActionButton
                style={{width: '100%'}}
                retry={false}
                onClick = {() => onAction('closePopup')}
                disabled={false}
                brandColor={brandColor}
                label={buttonLabel}
                isRunning={false}
                tabindex='3'
                classes={'sticky bottom'}
            />
        </div>
    );
};

export default SupportSuccess;
