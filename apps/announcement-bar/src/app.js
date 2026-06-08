import React from 'react';
import {Preview} from './components/preview';
import {Main} from './components/main';

export function App({apiUrl, previewData}) {
    if (previewData) {
        return <Preview previewData={previewData}/>;
    }
    return (
        <Main apiUrl={apiUrl} />
    );
}
