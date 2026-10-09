import { Component, render } from 'preact';
import { useEffect, useLayoutEffect, useState } from 'preact/hooks';
import type { ComponentChildren, JSX } from 'preact';

type LegacyContext = Record<string, unknown>;

type IFrameProps = {
  title: string;
  style: JSX.CSSProperties;
  head: ComponentChildren;
  children: ComponentChildren;
  onResize?: (el: HTMLElement) => void;
};

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

export default function IFrame(
  { title, style, head, children, onResize }: IFrameProps,
  context: LegacyContext,
) {
  const [frameDocument, setFrameDocument] = useState<Document | null>(null);

  useLayoutEffect(() => {
    if (frameDocument) {
      render(head, frameDocument.head);
      render(<ContextBridge context={context}>{children}</ContextBridge>, frameDocument.body);
    }
  });

  useLayoutEffect(() => {
    const frameWindow = frameDocument?.defaultView;
    if (!frameDocument || !frameWindow) {
      return;
    }

    const body = frameDocument.body;
    const observer = onResize ? new ResizeObserver(() => onResize(body)) : null;
    observer?.observe(body);

    // Keydown events only reach the focused frame's window, so forward them to the parent
    const forwardKeydown = (e: KeyboardEvent) => {
      window.dispatchEvent(new KeyboardEvent('keydown', e));
    };
    frameWindow.addEventListener('keydown', forwardKeydown);

    return () => {
      observer?.disconnect();
      frameWindow.removeEventListener('keydown', forwardKeydown);
    };
  }, [frameDocument, onResize]);

  useEffect(() => {
    return () => {
      if (frameDocument) {
        render(null, frameDocument.head);
        render(null, frameDocument.body);
      }
    };
  }, [frameDocument]);

  return (
    <iframe
      frameBorder="0"
      srcDoc="<!DOCTYPE html>"
      style={style}
      title={title}
      onLoad={(e) => {
        const doc = e.currentTarget.contentDocument;
        if (doc) {
          setFrameDocument(doc);
        }
      }}
    />
  );
}
