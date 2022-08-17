import React from 'react';
import {Editor, Container} from 'react-mobiledoc-editor';
import KoenigEditor from '../../KoenigEditor';
import {useConstructor} from '../../utils/useConstructor';

const CaptionLayout = ({children}) => {
    return (
        <figcaption className='p-2'>
            <div className="wrapper">
                <div className="caret-inherit cursor-text" >
                    {children}
                </div>
            </div>
        </figcaption>
    );
};

const CaptionInputs = ({payload, Alt}) => {
    const [instance, setInstance] = React.useState(null);
    const editorRef = React.useRef();

    useConstructor(() => {
        const kgInstance = new KoenigEditor({});
        editorRef.current = kgInstance;
    });

    function _didCreateEditor(mobiledocEditor) {
        setInstance(mobiledocEditor);
        editorRef.current.initMobiledocEditor(mobiledocEditor);
    }

    const handleTextChange = (e) => {
        if (Alt) {
            payload.setPayload({...payload.payload, alt: e.target.value});
        } else {
            let serialized = instance.serializeTo('html');
            payload.setPayload({...payload.payload, caption: serialized});
        }
    };

    if (Alt) {
        return (
            <input
                className="w-100 text-center font-sans text-sm"
                type='text'
                value={payload.payload.alt}
                onChange={handleTextChange}
                placeholder="Type alt text for image (optional)"
            />
        );
    } else {
        return (
            <React.Fragment>
                <Container
                    className="w-100 text-center font-sans text-sm"
                    html={payload.payload.caption}
                    didCreateEditor={_didCreateEditor}
                    onChange={handleTextChange}
                    placeholder="Type caption for image (optional)">
                    <Editor className="not-kg-prose text-center font-sans text-sm" />
                </Container>
            </React.Fragment>
        );
    }
};

const CaptionEditor = ({payload, Alt}) => {
    return (
        <CaptionLayout>
            <CaptionInputs payload={payload} Alt={Alt} />
        </CaptionLayout>
    );
};

export default CaptionEditor;
