import { render } from 'preact';
import { useEffect, useLayoutEffect, useState } from 'preact/hooks';
import type { ComponentChildren, JSX } from 'preact';

type FrameProps = {
  title: string;
  style: JSX.CSSProperties;
  dir: string;
  head: ComponentChildren;
  children: ComponentChildren;
};

// Children render as a separate Preact root inside the iframe, so context from
// the parent tree does not reach them; wrap them in any providers they need.
export default function Frame({ title, style, dir, head, children }: FrameProps) {
  const [frameDocument, setFrameDocument] = useState<Document | null>(null);

  useLayoutEffect(() => {
    if (frameDocument) {
      render(head, frameDocument.head);
      render(children, frameDocument.body);
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
