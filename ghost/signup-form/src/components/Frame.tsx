import IFrame from './IFrame';
import React, {useCallback, useState} from 'react';
import styles from '../styles/iframe.css?inline';

type FrameProps = {
    children: React.ReactNode
};

/**
 * This ResizableFrame takes the full width of the parent container
 */
export const Frame: React.FC<FrameProps> = ({children}) => {
    const style: React.CSSProperties = {
        width: '100%',
        height: '0px' // = default height
    };
    return (
        <ResizableFrame style={style} title="signup frame">
            {children}
        </ResizableFrame>
    );
};

type ResizableFrameProps = FrameProps & {
    style: React.CSSProperties,
    title: string,
};

/**
 * This TailwindFrame has the same height as it contents and mimics a shadow DOM component
 */
const ResizableFrame: React.FC<ResizableFrameProps> = ({children, style, title}) => {
    const [iframeStyle, setIframeStyle] = useState(style);
    const onResize = useCallback((iframeRoot: HTMLElement) => {
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

type TailwindFrameProps = ResizableFrameProps & {
    onResize: (el: HTMLElement) => void
};

/**
 * Loads all the CSS styles inside an iFrame.
 */
const TailwindFrame: React.FC<TailwindFrameProps> = ({children, onResize, style, title}) => {
    const head = (
        <>
            <style dangerouslySetInnerHTML={{__html: styles}} />
            <meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0" name="viewport" />
        </>
    );

    return (
        <IFrame head={head} style={style} title={title} onResize={onResize}>
            {children}
        </IFrame>
    );
};
