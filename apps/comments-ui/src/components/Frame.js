import React, {useContext, useState} from 'react';
import AppContext from '../AppContext';
import IFrame from './IFrame';

/**
 * Loads all the CSS styles inside an iFrame. Only shows the visible content as soon as the CSS file with the tailwind classes has loaded.
 */
const TailwindFrame = ({children, onResize, style, title}) => {
    const {stylesUrl} = useContext(AppContext);
    const [cssLoaded, setCssLoaded] = useState(!stylesUrl);

    const initialStyles = `
        body, html {
            overflow: hidden;
        }
    `;

    const onLoadCSS = () => {
        setCssLoaded(true);
    };

    const head = (
        <>
            {stylesUrl ? <link rel="stylesheet" href={stylesUrl} onLoad={onLoadCSS} /> : null}
            <style dangerouslySetInnerHTML={{__html: initialStyles}} />
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        </>
    );

    // For now we're using <NewFrame> because using a functional component with portal caused some weird issues with modals
    return (
        <IFrame head={head} style={style} onResize={onResize} title={title}>
            {cssLoaded && children}
        </IFrame>
    );
};

/**
 * This iframe has the same height as it contents and mimics a shadow DOM component
 */
const ResizableFrame = ({children, style, title}) => {
    const [iframeStyle, setIframeStyle] = useState(style);
    const onResize = (iframeRoot) => {
        setIframeStyle((current) => {
            return {
                ...current,
                height: `${iframeRoot.scrollHeight}px`
            };
        });
    };
    return (
        <TailwindFrame style={iframeStyle} onResize={onResize} title={title}>
            {children}
        </TailwindFrame>
    );
};

export const CommentsFrame = ({children}) => {
    const style = {
        width: '100%',
        height: '400px'
    };
    return (
        <ResizableFrame style={style} title="comments-frame">
            {children}
        </ResizableFrame>
    );
};

export const PopupFrame = ({children}) => {
    const style = {
        zIndex: '3999999',
        position: 'fixed',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        overflow: 'hidden'
    };

    return (
        <TailwindFrame style={style} title="popup-frame">
            {children}
        </TailwindFrame>
    );
};
