import React from 'react';
import root from 'react-shadow';

const CustomIFrame = ({
    children,
    ...props
}) => {
    const head = (
        <link rel="stylesheet" href="http://localhost:4000/main.css" />
    );

    return (
        <root.div {...props} title='ghost-comments-iframe' mode={'closed'}>
            {head}
            {children}
        </root.div>
    );
};

export default CustomIFrame;
