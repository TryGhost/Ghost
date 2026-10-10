import { Component, render } from 'preact';
import { useEffect, useLayoutEffect, useState } from 'preact/hooks';
import type { ComponentChildren, JSX } from 'preact';

type LegacyContext = Record<string, unknown>;

type FrameProps = {
  title: string;
  style: JSX.CSSProperties;
  dir: string;
  head: ComponentChildren;
  children: ComponentChildren;
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

export default function Frame(
  { title, style, dir, head, children }: FrameProps,
  context: LegacyContext,
) {
  const [frameDocument, setFrameDocument] = useState<Document | null>(null);

  useLayoutEffect(() => {
    if (frameDocument) {
      render(head, frameDocument.head);
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

  return (
    <iframe
      frameBorder="0"
      srcDoc="<!DOCTYPE html>"
      style={style}
      title={title}
      onLoad={(e) => {
        const doc = e.currentTarget.contentDocument;
        if (doc) {
          doc.documentElement.setAttribute('dir', dir);
          setFrameDocument(doc);
        }
      }}
    />
  );
}
