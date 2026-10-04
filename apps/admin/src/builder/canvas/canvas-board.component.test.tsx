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

it('keeps every tall-composition label attached to its preview and independently clickable at fit-all scale', async () => {
  let actions = 0;
  await renderInApp(
    <section style={{ width: 1200, height: 800 }}>
      <CanvasBoard
        frames={frames.map((frame) => ({
          ...frame,
          height: 10_000,
          viewport: { width: frame.width, height: frame.height },
        }))}
        renderFrame={(frame) => <iframe title={frame.label} />}
        renderFrameActions={(frame) => (
          <button
            type="button"
            onClick={() => {
              actions += 1;
            }}
          >
            Settings for {frame.label}
          </button>
        )}
      />
    </section>,
  );
  const buttons = frames.map((frame) =>
    page.getByRole('button', { name: frame.label, exact: true }),
  );
  const boxes = buttons.map((button) => button.element().getBoundingClientRect());
  boxes.forEach((box, index) => {
    const preview = document
      .querySelector(`[data-canvas-frame="${frames[index].id}"]`)!
      .getBoundingClientRect();
    expect(box.left).toBeCloseTo(preview.left, 1);
    expect(box.right).toBeLessThanOrEqual(preview.right + 1);
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
  await expect(page.getByRole('button', { name: /^Settings for/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Home · Mobile', exact: true }).dblClick();
  const settings = page.getByRole('button', { name: 'Settings for Home · Mobile', exact: true });
  await settings.click();
  expect(actions).toBe(1);
});

it('keeps browser keyboard focus and scroll under the camera when a frame is fitted', async () => {
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
  await page.getByRole('button', { name: 'Fit all' }).click();
  expect(world.style.transform).toBe(overview);
  expect([host.scrollLeft, host.scrollTop]).toEqual([0, 0]);
});

it('keeps a revealed desktop header and its controls usable on a narrow board', async () => {
  let actions = 0;
  await renderInApp(
    <section style={{ width: 600, height: 650 }}>
      <CanvasBoard
        frames={[frames[0]]}
        renderFrame={() => null}
        renderFrameActions={() => (
          <button
            type="button"
            onClick={() => {
              actions += 1;
            }}
          >
            Desktop settings
          </button>
        )}
      />
    </section>,
  );
  const header = page.getByRole('button', { name: 'Home · Desktop', exact: true });
  await header.dblClick();
  await header.click();
  await page.getByRole('button', { name: 'Desktop settings', exact: true }).click();
  expect(actions).toBe(1);
});

it('keeps cropped-frame actions from covering a neighboring header', async () => {
  await renderInApp(
    <section style={{ width: 600, height: 650 }}>
      <CanvasBoard
        frames={frames.slice(0, 2)}
        initialFitReady={false}
        renderFrame={() => null}
        renderFrameActions={(frame) => (
          <button aria-label={`Settings for ${frame.label}`} style={{ width: 32 }} type="button">
            …
          </button>
        )}
      />
    </section>,
  );
  const host = page.getByRole('region', { name: 'Theme canvas' }).element();
  host.dispatchEvent(new WheelEvent('wheel', { deltaX: 1340, deltaY: -60, bubbles: true }));
  await expect(
    page.getByRole('button', { name: 'Settings for Home · Desktop', exact: true }),
  ).toHaveCount(0);
  const mobile = page.getByRole('button', { name: 'Home · Mobile', exact: true });
  await mobile.click();
  await expect.element(mobile).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Home · Desktop', exact: true }).dblClick();
  await page.getByRole('button', { name: 'Settings for Home · Desktop', exact: true }).click();
});

it('lets every live frame receive a direct double-click without opening a mode', async () => {
  await renderInApp(
    <section style={{ width: 1200, height: 800 }}>
      <CanvasBoard
        frames={frames}
        renderFrame={(frame) => (
          <iframe
            srcDoc={
              '<button style="margin:80px" ondblclick="this.textContent=\'Edited directly\'">Direct edit</button>'
            }
            style={{ width: '100%', height: '100%', border: 0 }}
            title={`${frame.label} direct`}
          />
        )}
      />
    </section>,
  );
  const world = page.getByTestId('canvas-world').element() as HTMLElement;
  const camera = world.style.transform;
  for (const descriptor of frames) {
    const target = page.frameLocator(page.getByTitle(`${descriptor.label} direct`));
    await target.getByRole('button', { name: 'Direct edit', exact: true }).dblClick();
    await expect.element(target.getByRole('button', { name: 'Edited directly' })).toBeVisible();
  }
  expect(world.style.transform).toBe(camera);
  expect(document.querySelectorAll('[data-canvas-frame][inert]').length).toBe(0);
  expect(document.querySelectorAll('button').length).toBeGreaterThan(0);
  expect(document.body.textContent).not.toContain('Back to overview');
});

it('keeps a visible header interactive when its fallback action does not fit', async () => {
  await renderInApp(
    <section style={{ width: 500, height: 650 }}>
      <CanvasBoard
        frames={[frames[0]]}
        initialFitReady={false}
        renderFrame={() => null}
        renderFrameActions={() => (
          <button style={{ width: 32 }} type="button">
            Fallback
          </button>
        )}
      />
    </section>,
  );
  const host = page.getByRole('region', { name: 'Theme canvas' }).element() as HTMLElement;
  // Place the header completely inside the board while clipping its action.
  host.dispatchEvent(new WheelEvent('wheel', { deltaX: -330, deltaY: -60, bubbles: true }));
  const header = page.getByRole('button', { name: 'Home · Desktop', exact: true });
  await expect
    .poll(() => header.element().getBoundingClientRect().left - host.getBoundingClientRect().left)
    .toBe(330);
  expect(header.element().closest('[inert]')).toBeNull();
  await expect(page.getByRole('button', { name: 'Fallback' })).toHaveCount(0);
  await header.click();
  await expect.element(header).toHaveAttribute('aria-pressed', 'true');
  const world = page.getByTestId('canvas-world').element() as HTMLElement;
  const before = world.style.transform;
  await header.dblClick();
  expect(world.style.transform).not.toBe(before);
  await page.getByRole('button', { name: 'Fallback' }).click();
});
