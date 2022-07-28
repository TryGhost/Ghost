import * as React from 'react';
import root from 'react-shadow';
import Koenig from './components/Koenig';
import styles from './index.css';

const resetStyles = `
* {
    color: initial;
    font-size: initial;
}
`;

const Styles = () => {
    return (
        <style>
            {resetStyles}
            {styles}
        </style>
    );
};

const KoenigEditor = ({mobiledoc, atoms, keyCommands, didCreateEditor, onChange}) => {
    return (
        <root.div mode={'closed'}>
            <h1 className='font-bold text-5xl'>The Editor!</h1>
            <Koenig
                mobiledoc={mobiledoc}
                atoms={atoms}
                keyCommands={keyCommands}
                didCreateEditor={didCreateEditor}
                onChange={onChange}
            />
            <Styles />
        </root.div>
    );
};

export default KoenigEditor;
