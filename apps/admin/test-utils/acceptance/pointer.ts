import type { Locator } from 'vitest/browser';

const MOVE_STEPS = 8;

interface Point {
  x: number;
  y: number;
}

function centre(element: Element): Point {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function pointerInit(point: Point, buttons: number): PointerEventInit {
  return {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
    button: 0,
    buttons,
    clientX: point.x,
    clientY: point.y,
  };
}

/** A pointer event and the compatibility mouse event a browser follows it with. */
function press(element: Element, type: 'down' | 'move' | 'up', point: Point) {
  const init = pointerInit(point, type === 'up' ? 0 : 1);
  element.dispatchEvent(new PointerEvent(`pointer${type}`, init));
  element.dispatchEvent(new MouseEvent(`mouse${type}`, init));
}

const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

/**
 * A mouse press on `source` that travels to `to` and lets go, as the pointer
 * and mouse events a browser dispatches — the closing `click` included, in the
 * same task as the release. `userEvent.dragAndDrop` drives HTML5 drag and drop
 * instead, which dnd-kit's pointer and mouse sensors never see.
 *
 * `to` is another element (its centre) or an offset from where the press began.
 */
export async function dragByPointer(source: Locator, to: Locator | Point): Promise<void> {
  // A transition still running (a panel sliding in) moves the targets after they are measured.
  await Promise.allSettled(
    document
      .getAnimations()
      .filter((animation) => animation instanceof CSSTransition)
      .map((animation) => animation.finished),
  );
  const element = source.element();
  // Off screen, or by an edge, the drag would scroll its container under the pointer.
  element.scrollIntoView({ block: 'center' });
  const from = centre(element);
  const end = 'element' in to ? centre(to.element()) : { x: from.x + to.x, y: from.y + to.y };

  press(element, 'down', from);
  await nextFrame();

  for (let step = 1; step <= MOVE_STEPS; step += 1) {
    const point = {
      x: from.x + ((end.x - from.x) * step) / MOVE_STEPS,
      y: from.y + ((end.y - from.y) * step) / MOVE_STEPS,
    };
    press(element, 'move', point);
    await nextFrame();
  }

  press(element, 'up', end);
  element.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, clientX: end.x, clientY: end.y }),
  );
  await nextFrame();
}
