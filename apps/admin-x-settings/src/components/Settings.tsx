import React from 'react';

import AdvancedSettings from './settings/advanced/AdvancedSettings';
import EmailSettings from './settings/email/EmailSettings';
import GeneralSettings from './settings/general/GeneralSettings';
import MembershipSettings from './settings/membership/MembershipSettings';
import SiteSettings from './settings/site/SiteSettings';
// import UnsplashSearchModal from '../utils/unsplash/UnsplashSearchModal';

// const API_VERSION = 'v1';
// const API_TOKEN = '8672af113b0a8573edae3aa3713886265d9bb741d707f6c01a486cde8c278980';

// export const defaultHeaders = {
//     Authorization: `Client-ID ${API_TOKEN}`,
//     'Accept-Version': API_VERSION,
//     'Content-Type': 'application/json',
//     'App-Pragma': 'no-cache',
//     'X-Unsplash-Cache': true
// };

const Settings: React.FC = () => {
    return (
        <>
            <div className='mb-[40vh]'>
                <GeneralSettings />
                <SiteSettings />
                <MembershipSettings />
                <EmailSettings />
                <AdvancedSettings />
                <div className='mt-40 text-sm'>
                    <a className='text-green' href="/ghost/#/settings">Click here</a> to open the original Admin settings.
                </div>
            </div>
        </>
    );
};

export default Settings;
