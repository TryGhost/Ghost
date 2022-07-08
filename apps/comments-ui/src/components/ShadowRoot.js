import React from 'react';
import root from 'react-shadow';
import {getBundledCssLink} from '../utils/helpers';

const ShadowRoot = ({
    children,
    ...props
}) => {
    const cssLink = getBundledCssLink({appVersion: props.appVersion});
    const head = (
        <link rel="stylesheet" href={cssLink} />
    );

    return (
        <root.div {...props} mode={'closed'}>
            {head}
            {children}
        </root.div>
    );
};

export default ShadowRoot;
