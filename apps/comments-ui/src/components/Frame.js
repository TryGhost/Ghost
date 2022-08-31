import React, {useContext, useState} from 'react';
import AppContext from '../AppContext';
import IFrame from './IFrame';

const Frame = ({
    children,
    type,
    ...props
}) => {
    const {stylesUrl} = useContext(AppContext);

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
        width: '100%',
        height: '400px'
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

    const [cssLoaded, setCssLoaded] = useState(!stylesUrl);

    const onLoadCSS = () => {
        setCssLoaded(true);
    };

    const head = (
        <>
            {stylesUrl ? <link rel="stylesheet" href={stylesUrl} onLoad={onLoadCSS} /> : null}
            <style dangerouslySetInnerHTML={{__html: styles}} />
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        </>
    );

    // For now we're using <NewFrame> because using a functional component with portal caused some weird issues with modals
    return (
        <IFrame {...props} head={head} style={iframeStyle} onResize={type === 'dynamic' ? onResize : null}>
            {cssLoaded && children}
        </IFrame>
    );
};

export default Frame;
