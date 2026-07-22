import React from 'react';
import {DefaultHeaderTypes, UnsplashSearchModal} from '../src/index';

const App = () => {
    let unsplashConfig:DefaultHeaderTypes | null
     = {
         Authorization: `Client-ID 8672af113b0a8573edae3aa3713886265d9bb741d707f6c01a486cde8c278980`,
         'Accept-Version': 'v1',
         'Content-Type': 'application/json',
         'App-Pragma': 'no-cache',
         'X-Unsplash-Cache': true
     };

    // disable API access for testing
    if (import.meta.env.VITE_APP_TESTING === 'true') {
        unsplashConfig = null;
    }

    return (
        <div>
            <UnsplashSearchModal
                unsplashProviderConfig={unsplashConfig}
                onClose={() => {
                    alert('not implemented');
                }}
                onImageInsert={() => {
                    alert('not implemented');
                }}
            />
        </div>
    );
};

export default App;
