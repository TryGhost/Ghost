import {type CSSProperties, type ReactNode, useCallback, useEffect, useState} from 'react';
import iframeStyles from '../styles/iframe.css?inline';
import {isMinimal} from '../utils/helpers';
import {useAppContext} from '../app-context';
import {IFrame} from './IFrame';

interface FrameProps {
    children: ReactNode;
}

const BASE_STYLE: CSSProperties = {
    display: 'block', // prevents inline whitespace gap that causes height jumps
    width: '100%',
    height: '0px'
};

/**
 * Outer frame selector. Renders either a ResizableFrame (minimal/inline layout)
 * or a FullHeightFrame (full-bleed card layout) depending on whether a title is
 * configured.
 */
export function Frame({children}: FrameProps) {
    const {options} = useAppContext();
    const FrameComponent = isMinimal(options) ? ResizableFrame : FullHeightFrame;
    return <FrameComponent style={BASE_STYLE} title="signup frame">{children}</FrameComponent>;
}

interface InnerFrameProps {
    children: ReactNode;
    style: CSSProperties;
    title: string;
}

/**
 * Grows to match the natural scroll height of the iframe body. Used in the
 * minimal (no-title) layout where the form sits inline with surrounding text.
 */
function ResizableFrame({children, style, title}: InnerFrameProps) {
    const [iframeStyle, setIframeStyle] = useState<CSSProperties>(style);

    const onResize = useCallback((root: HTMLElement) => {
        setIframeStyle(prev => ({...prev, height: `${root.scrollHeight}px`}));
    }, []);

    const head = <IFrameHead />;

    return (
        <IFrame head={head} style={iframeStyle} title={title} onResize={onResize}>
            {children}
        </IFrame>
    );
}

/**
 * Expands to fill the parent container's width and height. Used in the full
 * card layout where the form takes up a configured block of space.
 */
function FullHeightFrame({children, style, title}: InnerFrameProps) {
    const {scriptTag} = useAppContext();
    const [iframeStyle, setIframeStyle] = useState<CSSProperties>(style);

    const onResize = useCallback((el: HTMLElement) => {
        setIframeStyle(prev => ({
            ...prev,
            height: `${el.scrollHeight}px`,
            width: `${el.scrollWidth}px`
        }));
    }, []);

    useEffect(() => {
        const parent = scriptTag.parentElement;
        if (!parent) return;
        const observer = new ResizeObserver(() => onResize(parent));
        observer.observe(parent);
        return () => observer.unobserve(parent);
    }, [scriptTag, onResize]);

    const head = <IFrameHead />;

    return (
        <div style={{position: 'absolute'}}>
            <IFrame head={head} style={iframeStyle} title={title}>
                {children}
            </IFrame>
        </div>
    );
}

/**
 * Content injected into the iframe `<head>`: Tailwind-processed CSS plus a
 * viewport meta tag for correct mobile rendering.
 */
function IFrameHead() {
    return (
        <>
            <style dangerouslySetInnerHTML={{__html: iframeStyles}} />
            <meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0" name="viewport" />
        </>
    );
}
