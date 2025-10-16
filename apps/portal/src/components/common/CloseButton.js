import {useContext} from 'react';
import AppContext from '../../AppContext';
import {ReactComponent as CloseIcon} from '../../images/icons/close.svg';

export default function CloseButton({onClick}) {
    const {doAction} = useContext(AppContext);

    const closePopup = () => {
        doAction('closePopup');
    };

    return (
        <div className='gh-portal-closeicon-container' data-test-button='close-popup'>
            <CloseIcon
                className='gh-portal-closeicon' alt='Close' onClick={onClick || closePopup} data-testid='close-popup'
            />
        </div>
    );
}
