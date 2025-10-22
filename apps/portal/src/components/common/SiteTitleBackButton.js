import {useContext} from 'react';
import AppContext from '../../AppContext';
import {t} from '../../utils/i18n';

export default function SiteTitleBackButton({onBack}) {
    const {doAction} = useContext(AppContext);

    const handleClick = () => {
        if (onBack) {
            onBack();
        } else {
            doAction('closePopup');
        }
    };

    return (
        <>
            <button
                className='gh-portal-btn gh-portal-btn-site-title-back'
                onClick={handleClick}>
                {/* eslint-disable-next-line i18next/no-literal-string */}
                <span>&larr; </span> {t('Back')}
            </button>
        </>
    );
}
