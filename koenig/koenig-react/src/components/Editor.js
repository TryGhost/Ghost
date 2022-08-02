// import {useContext} from 'react';
import {Editor as MobileDocEditor} from 'react-mobiledoc-editor';
// import * as ReactMobiledoc from 'react-mobiledoc-editor';

const Editor = ({
    setRange
}) => {
    // const {editor} = useContext(ReactMobiledoc.ReactMobileDocContext);
    return (
        <MobileDocEditor 
            className="prose"/>);
};

export default Editor;
