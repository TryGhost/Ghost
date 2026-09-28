import { useEffect, useState } from 'react';

function hasEditableFocus() {
  const element = document.activeElement;
  if (element instanceof HTMLTextAreaElement) {
    return !element.readOnly && !element.disabled;
  }
  if (element instanceof HTMLInputElement) {
    return (
      !element.readOnly &&
      !element.disabled &&
      ['text', 'search', 'email', 'url', 'tel', 'password', 'number'].includes(element.type)
    );
  }
  return element instanceof HTMLElement && element.isContentEditable === true;
}

/** Mobile keyboards reduce the visual viewport while leaving the layout viewport intact. */
export function useOnscreenKeyboard() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }

    const update = () => {
      // Ignore pinch zoom and small changes from the browser's collapsing address bar.
      setIsOpen(
        viewport.scale === 1 && window.innerHeight - viewport.height > 150 && hasEditableFocus(),
      );
    };

    update();
    viewport.addEventListener('resize', update);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      viewport.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);

  return isOpen;
}
