import React, {useState} from 'react';
import {createPortal} from 'react-dom';

const CustomIFrame = ({
    children,
    ...props
}) => {
    const [contentRef, setContentRef] = useState(null);
    const headNode = contentRef?.contentWindow?.document?.head;
    const mountNode = contentRef?.contentWindow?.document?.body;

    const head = (
        <link rel="stylesheet" href="http://localhost:4000/main.css" />
    );

    return (
        <iframe {...props} ref={setContentRef} title='iframeyall'>
            {headNode && createPortal(head, headNode)}
            {mountNode && createPortal(children, mountNode)}
        </iframe>
    );
};

export default CustomIFrame;