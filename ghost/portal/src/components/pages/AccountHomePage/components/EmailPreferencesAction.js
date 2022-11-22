import AppContext from 'AppContext';
import {hasCommentsEnabled, hasMultipleNewsletters} from 'utils/helpers';
import {useContext} from 'react';

function EmailPreferencesAction() {
    const {site, onAction} = useContext(AppContext);
    if (!hasMultipleNewsletters({site}) && !hasCommentsEnabled({site})) {
        return null;
    }
    return (
        <section>
            <div className='gh-portal-list-detail'>
                <h3>Emails</h3>
                <p>Update your preferences</p>
            </div>
            <button className='gh-portal-btn gh-portal-btn-list' onClick={(e) => {
                onAction('switchPage', {
                    page: 'accountEmail',
                    lastPage: 'accountHome'
                });
            }}>Manage</button>
        </section>
    );
}

export default EmailPreferencesAction;
