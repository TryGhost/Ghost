import styles from '../styles/iframe.css?inline';
import { Component, render } from 'preact';
import { useCallback, useEffect, useLayoutEffect, useState } from 'preact/hooks';
import type { ComponentChildren, JSX, Ref } from 'preact';

type LegacyContext = Record<string, unknown>;

// Preact passes every createContext provider down as legacy context; re-providing it
// lets useContext inside the frame's separate render root reach the parent's providers.
class ContextBridge extends Component<{ context: LegacyContext; children: ComponentChildren }> {
  getChildContext() {
    return this.props.context;
  }

  render() {
    return this.props.children;
  }
}

type TailwindFrameProps = {
  children: ComponentChildren;
  style: JSX.CSSProperties;
  title: string;
  iframeRef?: Ref<HTMLIFrameElement>;
  onResize?: (iframeRoot: HTMLElement) => void;
};

/**
 * Renders its children into an iframe that carries the Tailwind styles.
 */
function TailwindFrame(
  { children, style, title, iframeRef, onResize }: TailwindFrameProps,
  context: LegacyContext,
) {
  const [frameDocument, setFrameDocument] = useState<Document | null>(null);

  useLayoutEffect(() => {
    if (frameDocument) {
      render(
        <>
          <style dangerouslySetInnerHTML={{ __html: styles }} />
          <meta
            content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
            name="viewport"
          />
        </>,
        frameDocument.head,
      );
    }
  }, [frameDocument]);

  useLayoutEffect(() => {
    if (frameDocument) {
      render(<ContextBridge context={context}>{children}</ContextBridge>, frameDocument.body);
    }
  });

  useEffect(() => {
    return () => {
      if (frameDocument) {
        render(null, frameDocument.head);
        render(null, frameDocument.body);
      }
    };
  }, [frameDocument]);

  useLayoutEffect(() => {
    const frameWindow = frameDocument?.defaultView;
    if (!frameDocument || !frameWindow) {
      return;
    }

    // Keydown events only reach the focused iframe's window, so pass them on to the main window
    const forwardKeydown = (event: KeyboardEvent) => {
      window.dispatchEvent(new KeyboardEvent('keydown', event));
    };
    frameWindow.addEventListener('keydown', forwardKeydown);

    const observer = onResize
      ? new ResizeObserver(() => {
          window.requestAnimationFrame(() => onResize(frameDocument.body));
        })
      : null;
    observer?.observe(frameDocument.body);

    return () => {
      frameWindow.removeEventListener('keydown', forwardKeydown);
      observer?.disconnect();
    };
  }, [frameDocument, onResize]);

  return (
    <iframe
      ref={iframeRef}
      frameBorder="0"
      srcDoc="<!DOCTYPE html>"
      style={style}
      title={title}
      onLoad={(event) => setFrameDocument(event.currentTarget.contentDocument)}
    />
  );
}

type ResizableFrameProps = {
  children: ComponentChildren;
  style: JSX.CSSProperties;
  title: string;
  iframeRef?: Ref<HTMLIFrameElement>;
};

/**
 * This iframe has the same height as it contents and mimics a shadow DOM component
 */
function ResizableFrame({ children, style, title, iframeRef }: ResizableFrameProps) {
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
    <TailwindFrame iframeRef={iframeRef} style={iframeStyle} title={title} onResize={onResize}>
      {children}
    </TailwindFrame>
  );
}

type CommentsFrameProps = {
  children: ComponentChildren;
  iframeRef?: Ref<HTMLIFrameElement>;
};

export function CommentsFrame({ children, iframeRef }: CommentsFrameProps) {
  const style: JSX.CSSProperties = {
    width: '100%',
    height: '400px',
  };
  return (
    <ResizableFrame iframeRef={iframeRef} style={style} title="comments-frame">
      {children}
    </ResizableFrame>
  );
}

type PopupFrameProps = {
  children: ComponentChildren;
  title: string;
};

export function PopupFrame({ children, title }: PopupFrameProps) {
  const style: JSX.CSSProperties = {
    zIndex: '3999999',
    position: 'fixed',
    left: '0',
    top: '0',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  };

  return (
    <TailwindFrame style={style} title={title}>
      {children}
    </TailwindFrame>
  );
}
