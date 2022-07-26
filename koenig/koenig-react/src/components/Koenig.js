import * as React from 'react';
import {Editor, Container, Toolbar} from 'react-mobiledoc-editor';

function koenigEditor() {
    return (
        <Container className="my-2 px-2 md:mx-auto md:my-16 max-w-xl w-full">
            <Toolbar className="flex" />
            <Editor className="prose"/>
        </Container>
    );
}

export default koenigEditor;
