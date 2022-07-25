import * as React from 'react';
import {Editor, Container, Toolbar} from 'react-mobiledoc-editor';
import './index.css';

function koenigEditor() {
    return (
        <>
            <h1 className='font-bold text-5xl'>The Editor</h1>
            <Container className="my-2 px-2 md:mx-auto md:my-16 max-w-xl w-full">
                <Toolbar className="flex" />
                <Editor className="prose"/>
            </Container>
        </>
    );
}

export default koenigEditor;
