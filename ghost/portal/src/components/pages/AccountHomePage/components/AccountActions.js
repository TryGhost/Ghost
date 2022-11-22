import AppContext from 'AppContext';
import {useContext} from 'react';

import PaidAccountActions from './PaidAccountActions';
import EmailNewsletterAction from './EmailNewsletterAction';
import EmailPreferencesAction from './EmailPreferencesAction';

const AccountActions = () => {
    const {member, onAction} = useContext(AppContext);
    const {name, email} = member;

    const openEditProfile = () => {
        onAction('switchPage', {
            page: 'accountProfile',
            lastPage: 'accountHome'
        });
    };

    return (
        <div>
            <div className='gh-portal-list'>
                <section>
                    <div className='gh-portal-list-detail'>
                        <h3>{(name ? name : 'Account')}</h3>
                        <p>{email}</p>
                    </div>
                    <button className='gh-portal-btn gh-portal-btn-list' onClick={e => openEditProfile(e)}>Edit</button>
                </section>

                <PaidAccountActions />
                <EmailPreferencesAction />
                <EmailNewsletterAction />
            </div>
            {/* <ProductList openUpdatePlan={openUpdatePlan}></ProductList> */}
        </div>
    );
};

export default AccountActions;
