import * as React from 'react';
import Koenig from './components/Koenig';
import './index.css';

function koenigEditor() {
    return (
        <>
            <h1 className='font-bold text-5xl'>The Editor!</h1>
            <Koenig />
        </>
    );
}

export default koenigEditor;
