import AppContext from 'AppContext';
import {useContext} from 'react';
import CloseButton from 'components/common/CloseButton';

export default function EmailSuppressedPage() {
    const {onAction} = useContext(AppContext);

    const onClose = () => {
        onAction('switchPage', {page: 'emailSuppressed', lastPage: 'accountHome'});
    };

    return (
        <div className="gh-email-suppression-faq">
            <header className='gh-portal-detail-header'>
                <CloseButton onClick={onClose} />
            </header>

            <div>
                <h3>Why is my email disabled?</h3>
            </div>
        </div>
    );
}
