import { afterEach, describe, expect, it, vi } from 'vitest';
import { safeAreaBoundary, safeAreaCollision } from '../../../src/lib/safe-area';

const setInsets = (root: HTMLElement, insets: Record<string, string> | undefined) => {
  for (const side of ['top', 'right', 'bottom', 'left']) {
    const name = `--ghost-safe-area-inset-${side}`;
    if (insets) {
      root.style.setProperty(name, insets[side]);
    } else {
      root.style.removeProperty(name);
    }
  }
};

const INSETS = { top: '0px', right: '0px', bottom: '57px', left: '82px' };

describe('a popup in a Ghost app’s safe area', () => {
  afterEach(() => {
    setInsets(document.documentElement, undefined);
    document.querySelectorAll('[data-ghost-safe-area]').forEach((element) => element.remove());
  });

  it('has no boundary of its own outside an app, and keeps the caller’s', () => {
    expect(safeAreaBoundary()).toBeUndefined();
    expect(safeAreaCollision(undefined)).toEqual({
      collisionBoundary: undefined,
      'data-safe-area': undefined,
    });
  });

  it('keeps inside one element that covers the safe area, which follows its variables', () => {
    setInsets(document.documentElement, INSETS);

    const boundary = safeAreaBoundary()!;
    expect(boundary.parentElement).toBe(document.body);
    expect(boundary.style.position).toBe('fixed');
    expect(boundary.style.getPropertyValue('bottom')).toBe(
      'var(--ghost-safe-area-inset-bottom, 0px)',
    );
    expect(safeAreaBoundary()).toBe(boundary);
    expect(safeAreaCollision(undefined)).toEqual({
      collisionBoundary: boundary,
      'data-safe-area': '',
    });
  });

  it('keeps a boundary the caller gives', () => {
    setInsets(document.documentElement, INSETS);
    const own = document.createElement('div');

    expect(safeAreaCollision(own).collisionBoundary).toBe(own);
  });

  it('has open popups follow the safe area as it changes, in an app only', async () => {
    const frame = document.createElement('iframe');
    document.body.append(frame);
    const view = frame.contentWindow!;
    const root = view.document.createElement('div');
    view.document.body.append(root);
    const scrolled = vi.fn();
    view.addEventListener('scroll', scrolled);
    const change = async (property: string, value: string) => {
      view.document.documentElement.style.setProperty(property, value);
      await Promise.resolve();
    };

    expect(safeAreaBoundary(root)).toBeUndefined();
    await change('color', 'red');
    expect(scrolled).not.toHaveBeenCalled();

    setInsets(view.document.documentElement, INSETS);
    safeAreaBoundary(root);
    await change('--ghost-safe-area-inset-bottom', '120px');
    expect(scrolled).toHaveBeenCalled();
    frame.remove();
  });

  it('keeps inside the safe area of the document it opens in', () => {
    const frame = document.createElement('iframe');
    document.body.append(frame);
    const overlay = frame.contentDocument!;
    const root = overlay.createElement('div');
    overlay.body.append(root);
    setInsets(overlay.documentElement, { ...INSETS, top: '44px' });

    expect(safeAreaBoundary()).toBeUndefined();
    expect(safeAreaBoundary(root)?.parentElement).toBe(root);
    frame.remove();
  });
});
