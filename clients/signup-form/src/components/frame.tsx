import IFrame from './iframe';
import styles from '../styles/iframe.css?inline';
import { isMinimal } from '../utils/helpers';
import { useAppContext } from '../app-context';
import { useCallback, useLayoutEffect, useState } from 'preact/hooks';
import type { ComponentChildren, JSX } from 'preact';

type FrameProps = {
  children: ComponentChildren;
};

/**
 * This ResizableFrame takes the full width of the parent container
 */
export const Frame = ({ children }: FrameProps) => {
  const style: JSX.CSSProperties = {
    display: 'block', // iframe is by default inline, if we don't add this, the container will take up more height due to spaces, causing layout jumps
    width: '100%',
    height: '0px', // = default height
  };

  const { options } = useAppContext();
  if (isMinimal(options)) {
    return (
      <ResizableFrame style={style} title="signup frame">
        {children}
      </ResizableFrame>
    );
  }

  return (
    <FullHeightFrame style={style} title="signup frame">
      {children}
    </FullHeightFrame>
  );
};

type ResizableFrameProps = FrameProps & {
  style: JSX.CSSProperties;
  title: string;
};

/**
 * This TailwindFrame has the same height as it contents and mimics a shadow DOM component
 */
const ResizableFrame = ({ children, style, title }: ResizableFrameProps) => {
  const [iframeStyle, setIframeStyle] = useState(style);
  const onResize = useCallback((iframeRoot: HTMLElement) => {
    setIframeStyle((current) => {
      return {
        ...current,
        height: `${iframeRoot.scrollHeight}px`,
      };
    });
  }, []);

  return (
    <TailwindFrame style={iframeStyle} title={title} onResize={onResize}>
      {children}
    </TailwindFrame>
  );
};

/**
 * This TailwindFrame has the same height as its container
 */
const FullHeightFrame = ({ children, style, title }: ResizableFrameProps) => {
  const { scriptTag } = useAppContext();
  const [iframeStyle, setIframeStyle] = useState(style);

  const onResize = useCallback((element: HTMLElement) => {
    setIframeStyle((current) => {
      return {
        ...current,
        height: `${element.scrollHeight}px`,
        width: `${element.scrollWidth}px`,
      };
    });
  }, []);

  useLayoutEffect(() => {
    const element = scriptTag.parentElement;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver((_) => onResize(element));
    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [scriptTag, onResize]);

  return (
    <div style={{ position: 'absolute' }}>
      <TailwindFrame style={iframeStyle} title={title}>
        {children}
      </TailwindFrame>
    </div>
  );
};

type TailwindFrameProps = ResizableFrameProps & {
  onResize?: (el: HTMLElement) => void;
};

/**
 * Loads all the CSS styles inside an iFrame.
 */
const TailwindFrame = ({ children, onResize, style, title }: TailwindFrameProps) => {
  const head = (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0" name="viewport" />
    </>
  );

  return (
    <IFrame head={head} style={style} title={title} onResize={onResize}>
      {children}
    </IFrame>
  );
};
