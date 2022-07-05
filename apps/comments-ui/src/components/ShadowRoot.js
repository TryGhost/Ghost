import React from 'react';
import root from 'react-shadow';

const ShadowRoot = ({
    children,
    ...props
}) => {
    const head = (
        <link rel="stylesheet" href="http://localhost:4000/main.css" />
    );

    return (
        <root.div {...props} title='ghost-comments-shadowroot' mode={'closed'}>
            {head}
            {children}
        </root.div>
    );
};

export default ShadowRoot;
