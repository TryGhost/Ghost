import IFrame from './IFrame';
import React, {useCallback, useState} from 'react';
import styles from '../styles/iframe.css?inline';

/**
 * Loads all the CSS styles inside an iFrame. Only shows the visible content as soon as the CSS file with the tailwind classes has loaded.
 */
const TailwindFrame = ({children, onResize, style, title}) => {
    const head = (
        <>
            <style dangerouslySetInnerHTML={{__html: styles}} />
            <meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0" name="viewport" />
        </>
    );

    // For now we're using <NewFrame> because using a functional component with portal caused some weird issues with modals
    return (
        <IFrame head={head} style={style} title={title} onResize={onResize}>
            {children}
        </IFrame>
    );
};

/**
 * This iframe has the same height as it contents and mimics a shadow DOM component
 */
const ResizableFrame = ({children, style, title}) => {
    const [iframeStyle, setIframeStyle] = useState(style);
    const onResize = useCallback((iframeRoot) => {
        setIframeStyle((current) => {
            return {
                ...current,
                height: `${iframeRoot.scrollHeight}px`
            };
        });
    }, []);

    return (
        <TailwindFrame style={iframeStyle} title={title} onResize={onResize}>
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

export const PopupFrame = ({children, title}) => {
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
        <TailwindFrame style={style} title={title}>
            {children}
        </TailwindFrame>
    );
};
