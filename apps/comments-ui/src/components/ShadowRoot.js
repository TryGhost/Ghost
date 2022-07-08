import React from 'react';
import root from 'react-shadow';
import {getBundledCssLink} from '../utils/helpers';

const ShadowRoot = ({
    children,
    ...props
}) => {
    const cssLink = getBundledCssLink({appVersion: props.appVersion});

    const styles = `
        .ghost-display {
            display: none;
        }
    `;

    const head = (
        <>
            <link rel="stylesheet" href={cssLink} />
            <style dangerouslySetInnerHTML={{__html: styles}} />
        </>
    );

    return (
        <root.div {...props} mode={'closed'}>
            {head}
            {children}
        </root.div>
    );
};

export default ShadowRoot;
