import { expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { renderInApp } from '@test-utils/acceptance/render-in-app';
import { CanvasBoard } from './canvas-board';

const frames = [
  {
    id: 'home-desktop',
    label: 'Home · Desktop',
    group: 'Home',
    x: 0,
    y: 0,
    width: 1440,
    height: 900,
  },
  {
    id: 'home-mobile',
    label: 'Home · Mobile',
    group: 'Home',
    x: 1488,
    y: 0,
    width: 390,
    height: 844,
  },
  {
    id: 'post-desktop',
    label: 'Post · Desktop',
    group: 'Post',
    x: 1974,
    y: 0,
    width: 1440,
    height: 900,
  },
  {
    id: 'post-mobile',
    label: 'Post · Mobile',
    group: 'Post',
    x: 3462,
    y: 0,
    width: 390,
    height: 844,
  },
];

it('keeps every tall-composition label readable and independently clickable at fit-all scale', async () => {
  await renderInApp(
    <section style={{ width: 1200, height: 800 }}>
      <CanvasBoard
        frames={frames.map((frame) => ({
          ...frame,
          height: 10_000,
          viewport: { width: frame.width, height: frame.height },
        }))}
        renderFrame={(frame) => <iframe title={frame.label} />}
      />
    </section>,
  );
  const buttons = frames.map((frame) =>
    page.getByRole('button', { name: frame.label, exact: true }),
  );
  const boxes = buttons.map((button) => button.element().getBoundingClientRect());
  boxes.forEach((box, index) => {
    for (const other of boxes.slice(index + 1)) {
      expect(
        box.right <= other.left ||
          other.right <= box.left ||
          box.bottom <= other.top ||
          other.bottom <= box.top,
      ).toBe(true);
    }
  });
  for (const button of buttons) {
    await button.click();
    await expect.element(button).toHaveAttribute('aria-pressed', 'true');
  }
});

it('keeps browser keyboard focus and scroll under the camera when a frame is opened', async () => {
  await renderInApp(
    <section style={{ width: 1100, height: 650 }}>
      <CanvasBoard frames={frames} renderFrame={(frame) => <iframe title={frame.label} />} />
    </section>,
  );
  const host = page.getByRole('region', { name: 'Theme canvas' }).element() as HTMLElement;
  const world = page.getByTestId('canvas-world').element() as HTMLElement;
  const overview = world.style.transform;
  await page.getByRole('button', { name: 'Home · Mobile', exact: true }).dblClick();
  const opened = world.style.transform;
  expect(opened).not.toBe(overview);
  for (let index = 0; index < 12; index++) {
    await userEvent.keyboard('{Tab}');
    expect([host.scrollLeft, host.scrollTop]).toEqual([0, 0]);
    expect(world.style.transform).toBe(opened);
  }
  const back = page.getByRole('button', { name: 'Back to overview' });
  (back.element() as HTMLElement).focus();
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => document.activeElement).toBe(host);
  expect(world.style.transform).toBe(overview);
  expect([host.scrollLeft, host.scrollTop]).toEqual([0, 0]);
});
