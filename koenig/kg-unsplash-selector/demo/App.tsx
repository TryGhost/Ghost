import React, {useMemo} from 'react';
import {InMemoryUnsplashProvider} from '../src/api/InMemoryUnsplashProvider';
import {UnsplashProvider} from '../src/api/UnsplashProvider';
import {UnsplashSearchModal} from '../src/index';

const App = () => {
    const unsplashRepo = useMemo(() => {
        if (import.meta.env.VITE_APP_TESTING === 'true') {
            return new InMemoryUnsplashProvider();
        } else {
            const unsplashConfig = {
                defaultHeaders: {
                    Authorization: `Client-ID 8672af113b0a8573edae3aa3713886265d9bb741d707f6c01a486cde8c278980`,
                    'Accept-Version': 'v1',
                    'Content-Type': 'application/json',
                    'App-Pragma': 'no-cache',
                    'X-Unsplash-Cache': true
                }
            };
            return new UnsplashProvider(unsplashConfig.defaultHeaders);
        }
    }, []);

    return (
        <UnsplashSearchModal
            unsplashProvider={unsplashRepo}
            onClose={() => {
                alert('not implemented');
            }}
            onImageInsert={() => {
                alert('not implemented');
            }}
        />
    );
};

export default App;
