import React, {useContext, useState} from 'react';
import {getBundledCssLink} from '../utils/helpers';
import AppContext from '../AppContext';
import IFrame from './IFrame';

const Frame = ({
    children,
    type,
    style,
    ...props
}) => {
    const {appVersion} = useContext(AppContext);
    const cssLink = getBundledCssLink({appVersion});

    const styles = `
        body, html {
            overflow: hidden;
        }
    `;

    // We have two types of frames:
    // - A full width + content fitted height one
    // - A fixed positioned one for modals
    /**
     * @type {'dynamic'|'fixed'}
     */
    type = type ?? 'dynamic';

    // For now we don't listen for type changes, we could consider adding useEffect, but that won't be used
    const defaultStyle = type === 'dynamic' ? {
        width: 'calc(100% + min(8vmin, 40px))',
        height: '400px',
        marginLeft: 'max(-4vmin,-20px)', // negative margins to handle comment alignments and shadows
        marginRight: 'max(-4vmin,-20px)'
    } : {
        zIndex: '3999999',
        position: 'fixed',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        overflow: 'hidden'
    };

    const [iframeStyle, setIframeStyle] = useState(defaultStyle);

    const onResize = (iframeRoot) => {
        setIframeStyle((current) => {
            return {
                ...current, 
                height: `${iframeRoot.scrollHeight}px`
            };
        });
    };

    const [cssLoaded, setCssLoaded] = useState(false);

    const onLoadCSS = () => {
        setCssLoaded(true);
    };

    const head = (
        <>
            <link rel="stylesheet" href={cssLink} onLoad={onLoadCSS} />
            <style dangerouslySetInnerHTML={{__html: styles}} />
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        </>
    );

    const mergedStyle = {...iframeStyle, ...style};

    // For now we're using <NewFrame> because using a functional component with portal caused some weird issues with modals
    return (
        <IFrame {...props} head={head} style={mergedStyle} onResize={type === 'dynamic' ? onResize : null}>
            {cssLoaded && children}
        </IFrame>
    );
};

export default Frame;
