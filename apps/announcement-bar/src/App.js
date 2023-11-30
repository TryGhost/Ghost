import React from 'react';
import {Preview} from './components/Preview';
import {Main} from './components/Main';

export function App({apiUrl, previewData}) {
    if (previewData) {
        return <Preview previewData={previewData}/>;
    }
    return (
        <Main apiUrl={apiUrl} />
    );
}
