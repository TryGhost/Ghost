import {ReactComponent as CloseIcon} from '../../images/icons/close.svg';
import {t} from '../../utils/i18n';

const CloseIconButton = ({onClick, ariaLabel}) => {
    return (
        <div className='gh-portal-closeicon-container' data-test-button='close-popup'>
            <CloseIcon
                className='gh-portal-closeicon'
                alt='Close'
                aria-label={ariaLabel || t('Close')}
                onClick={onClick}
                data-testid='close-popup'
            />
        </div>
    );
};

export default CloseIconButton;
