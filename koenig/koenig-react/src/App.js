import * as React from 'react';
import {Editor, Container, Toolbar} from 'react-mobiledoc-editor';
import './index.css';

function koenigEditor() {
    return (
        <>
            <h1 className='font-bold text-5xl'>The Editor!</h1>
            <Container>
                <Toolbar className="flex" />
                <Editor/>
            </Container>
        </>
    );
}

export default koenigEditor;
