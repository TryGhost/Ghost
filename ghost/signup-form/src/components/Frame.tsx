import IFrame from './IFrame';
import React, {useCallback, useState} from 'react';
import styles from '../styles/iframe.css?inline';
import {useAppContext} from '../AppContext';

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
        <FullHeightFrame style={style} title="signup frame">
            {children}
        </FullHeightFrame>
    );
};

type ResizableFrameProps = FrameProps & {
    style: React.CSSProperties,
    title: string,
};

/**
 * This TailwindFrame has the same height as its container
 */
const FullHeightFrame: React.FC<ResizableFrameProps> = ({children, style, title}) => {
    const {scriptTag} = useAppContext();
    const [iframeStyle, setIframeStyle] = useState(style);

    const onResize = useCallback((element: HTMLElement) => {
        setIframeStyle((current) => {
            return {
                ...current,
                height: `${element.scrollHeight}px`,
                width: `${element.scrollWidth}px`
            };
        });
    }, []);

    React.useEffect(() => {
        const element = scriptTag.parentElement;
        if (!element) {
            return;
        }
        const observer = new ResizeObserver(_ => onResize(element));
        observer.observe(element);

        return () => {
            observer.unobserve(element);
        };
    }, [scriptTag, onResize]);

    return (
        <div style={{position: 'absolute'}}>
            <TailwindFrame style={iframeStyle} title={title}>
                {children}
            </TailwindFrame>
        </div>
    );
};

type TailwindFrameProps = ResizableFrameProps & {
    onResize?: (el: HTMLElement) => void
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
