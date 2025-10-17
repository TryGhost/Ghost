import React, {useContext, useEffect} from 'react';
import AppContext from '../../../AppContext';
import {getSupportAddress, isSigninAllowed} from '../../../utils/helpers';

import AccountFooter from './components/AccountFooter';
import AccountMain from './components/AccountMain';

function AccountHomePage() {
    const {member, site, doAction} = useContext(AppContext);

    useEffect(() => {
        if (!isSigninAllowed({site})) {
            doAction('signout');
        }

        if (!member) {
            doAction('switchPage', {
                page: 'signin',
                pageData: {
                    redirect: window.location.href // This includes the search/fragment of the URL (#/portal/account) which is missing from the default referer header
                }
            });
        }
    }, [member, site, doAction]);

    const handleSignout = (e) => {
        e.preventDefault();
        doAction('signout');
    };

    const supportAddress = getSupportAddress({site});

    if (!member) {
        return null;
    }
    if (!isSigninAllowed({site})) {
        return null;
    }

    return (
        <div className='gh-portal-account-wrapper'>
            <AccountMain />
            <AccountFooter
                onClose={() => doAction('closePopup')}
                handleSignout={handleSignout}
                supportAddress={supportAddress}
            />
        </div>
    );
}

export default AccountHomePage;
