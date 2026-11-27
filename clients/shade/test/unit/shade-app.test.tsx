import { afterEach, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import { ShadeApp } from '../../src/app';

const SAFE_AREA_PADDING = [
  'pt-[var(--ghost-safe-area-inset-top,0px)]',
  'pr-[var(--ghost-safe-area-inset-right,0px)]',
  'pb-[var(--ghost-safe-area-inset-bottom,0px)]',
  'pl-[var(--ghost-safe-area-inset-left,0px)]',
];

const setSafeArea = () => {
  document.documentElement.style.setProperty('--ghost-safe-area-inset-top', '0px');
  document.documentElement.style.setProperty('--ghost-safe-area-inset-left', '240px');
};

afterEach(() => {
  document.documentElement.removeAttribute('style');
});

it("pads the app by the safe area a Ghost app's SDK sets", () => {
  setSafeArea();
  const { container } = render(<ShadeApp darkMode={false}>App</ShadeApp>);

  const root = container.firstElementChild!;
  expect([...root.classList]).toEqual(expect.arrayContaining(['shade', ...SAFE_AREA_PADDING]));
});

it('pads the app once the SDK sets the safe area after it renders', async () => {
  const { container } = render(<ShadeApp darkMode={false}>App</ShadeApp>);
  await act(async () => setSafeArea());

  const root = container.firstElementChild!;
  expect([...root.classList]).toEqual(expect.arrayContaining(['shade', ...SAFE_AREA_PADDING]));
});

it("lets the app's own padding win", () => {
  setSafeArea();
  const { container } = render(
    <ShadeApp className="shade-admin p-0" darkMode={false}>
      App
    </ShadeApp>,
  );

  const root = container.firstElementChild!;
  expect([...root.classList]).toEqual(['shade', 'shade-admin', 'p-0']);
});

it("adds nothing to the app's classes outside a Ghost app", () => {
  const { container } = render(
    <ShadeApp className="shade-admin p-4 p-2" darkMode={false}>
      App
    </ShadeApp>,
  );

  const root = container.firstElementChild!;
  expect(root.getAttribute('class')).toBe('shade shade-admin p-4 p-2');
});
