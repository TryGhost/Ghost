import { useLayoutEffect, useRef } from 'preact/hooks';
import type { Editor } from '@tiptap/core';
import type { JSX } from 'preact';

type EditorContentProps = JSX.HTMLAttributes<HTMLDivElement> & {
  editor: Editor;
};

/**
 * Mounts the editor's DOM, which tiptap creates in a detached element.
 */
export function EditorContent({ editor, ...props }: EditorContentProps) {
  const element = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = element.current!;
    container.append(...editor.options.element.childNodes);
    editor.setOptions({ element: container });

    return () => {
      const detached = document.createElement('div');
      detached.append(...container.childNodes);
      editor.setOptions({ element: detached });
    };
  }, [editor]);

  return <div ref={element} {...props} />;
}
