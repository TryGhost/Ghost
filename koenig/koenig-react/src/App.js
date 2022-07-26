import * as React from 'react';
import Koenig from './components/Koenig';
import './index.css';

function koenigEditor({mobiledoc, onChange}) {
    return (
        <>
            <h1 className='font-bold text-5xl'>The Editor!</h1>
            <Koenig mobiledoc={mobiledoc} onChange={onChange} />
        </>
    );
}

export default koenigEditor;
