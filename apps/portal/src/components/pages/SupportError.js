import {useContext} from 'react';
import AppContext from '../../AppContext';
import CloseButton from '../common/CloseButton';
import ActionButton from '../common/ActionButton';
import {ReactComponent as WarningIcon} from '../../images/icons/warning-outline.svg';
import * as Sentry from '@sentry/react';

export const TipsAndDonationsErrorStyle = `
    .gh-portal-tips-and-donations .gh-tips-and-donations-icon-error {
        padding: 10px 0;
        text-align: center;
        width: 48px;
        margin: 0 auto;
        color: #f50b23;
    }

    .gh-portal-tips-donations .gh-tips-donations-icon.gh-feedback-icon-error {
        color: #f50b23;
        width: 96px;
    }

    .gh-portal-tips-and-donations .gh-portal-text-center {
        padding: 16px 32px 12px;
    }
`;

const SupportError = ({error}) => {
    const {onAction, t} = useContext(AppContext);
    const errorTitle = t('Sorry, that didn’t work.');
    const errorMessage = error || t('There was an error processing your payment. Please try again.');
    const buttonLabel = t('Close');

    if (error) { // Log error to Sentry
        Sentry.captureException(error);
    }

    return (
        <div className='gh-portal-content gh-portal-tips-and-donations'>
            <CloseButton />

            <div className="gh-tips-and-donations-icon-error">
                <WarningIcon />
            </div>
            <h1 className="gh-portal-main-title">{errorTitle}</h1>
            <p className="gh-portal-text-center">{errorMessage}</p>
            <ActionButton
                style={{width: '100%'}}
                retry={true}
                onClick = {() => onAction('closePopup')}
                disabled={false}
                brandColor='#000000'
                label={buttonLabel}
                isDestructive={true}
                isRunning={false}
                tabindex='3'
                classes={'sticky bottom'}
            />
        </div>
    );
};

export default SupportError;