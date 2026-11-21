import { expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ShadeApp } from '../../src/app';

const SAFE_AREA_PADDING = [
  'pt-[var(--ghost-safe-area-inset-top,0px)]',
  'pr-[var(--ghost-safe-area-inset-right,0px)]',
  'pb-[var(--ghost-safe-area-inset-bottom,0px)]',
  'pl-[var(--ghost-safe-area-inset-left,0px)]',
];

it("pads the app by the safe area a Ghost app's SDK sets", () => {
  const { container } = render(<ShadeApp darkMode={false}>App</ShadeApp>);

  const root = container.firstElementChild!;
  expect([...root.classList]).toEqual(expect.arrayContaining(['shade', ...SAFE_AREA_PADDING]));
});

it("lets the app's own padding win", () => {
  const { container } = render(
    <ShadeApp className="shade-admin p-0" darkMode={false}>
      App
    </ShadeApp>,
  );

  const root = container.firstElementChild!;
  expect([...root.classList]).toEqual(['shade', 'shade-admin', 'p-0']);
});
