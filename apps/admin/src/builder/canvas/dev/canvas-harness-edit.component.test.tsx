import { expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { Box } from '@tryghost/shade/primitives';
import { renderInApp } from '@test-utils/acceptance/render-in-app';
import { CanvasHarness } from './canvas-harness';
import { FixtureClient } from './fixture-client';
import type { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';

// This journey includes separate bounded initial-load and accepted-render waits.
it(
  'edits real Source template text through the canvas and prevents a second retained draft',
  { timeout: 60_000 },
  async () => {
    const devices = new Map<string, IframePreviewDocumentSurface>();
    const signal = new AbortController().signal;
    const heldRequests: MessageEvent<unknown>[] = [];
    let holdIncoming = false;
    let holdOlderIntent = false;
    const olderIntents: MessageEvent<unknown>[] = [];
    // Preserve the worker implementation and invoke it with the fixture instance below.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalRender = FixtureClient.prototype.render;
    const focusFixture = vi.spyOn(FixtureClient.prototype, 'render');
    focusFixture.mockImplementation(async function (this: FixtureClient, edit) {
      const result = await originalRender.call(this, edit);
      const focusScript = `<script>window.addEventListener('message', event => {
        if (event.data === 'test-focus-literal') document.querySelector('a[href="https://ghost.org/"]').focus();
      });</script>`;
      return {
        ...result,
        html: { home: result.html.home + focusScript, post: result.html.post + focusScript },
      };
    });
    const holdRequest = (event: MessageEvent<unknown>) => {
      const packet = event.data as { type?: string; input?: { kind?: string } } | null;
      if (
        holdOlderIntent &&
        packet &&
        (packet.type === 'select' ||
          (packet.type === 'canvas-input' && packet.input?.kind === 'escape'))
      ) {
        olderIntents.push(event);
        event.stopImmediatePropagation();
        return;
      }
      if (
        holdIncoming &&
        packet &&
        ['select', 'inline-text-admission'].includes(packet.type ?? '')
      ) {
        heldRequests.push(event);
        event.stopImmediatePropagation();
      }
    };
    // Window-target message listeners run in registration order. Install the gate
    // before the harness listeners so requests are held before parent processing.
    window.addEventListener('message', holdRequest, true);
    let releaseMode = () => {};
    const text = async (id: string, selector: string) =>
      (await devices.get(id)!.inspectElement({ selector }, signal)).text;
    const screen = await renderInApp(
      <Box style={{ width: 1500, height: 1100 }}>
        <CanvasHarness
          fixtureId="source"
          onCompositionSurface={(id, surface) => {
            if (surface) {
              devices.set(id, surface);
            } else {
              devices.delete(id);
            }
          }}
        />
      </Box>,
    );
    try {
      await expect
        .poll(() => document.querySelectorAll('iframe[data-preview-status="Ready"]').length, {
          timeout: 30_000,
        })
        .toBe(8);
      expect(document.querySelector('[data-capture-artifact]')).toBeNull();
      expect(document.querySelector('[data-canvas-diagnostics]')).toBeNull();
      expect(document.querySelector('[data-canvas-frame][inert]')).toBeNull();
      expect(document.body.textContent).not.toContain('Back to overview');
      const frame = (name: string) =>
        page.frameLocator(page.getByTitle(`${name} composition`, { exact: true }));
      const originalDevices = [...devices.entries()];
      const home = devices.get('home-mobile')!;
      const port = (home as unknown as { commandPort: MessagePort }).commandPort;
      const postMessage = port.postMessage.bind(port);
      let admission: unknown;
      const heldAdmission = vi.spyOn(port, 'postMessage').mockImplementation((message: unknown) => {
        if (
          message &&
          typeof message === 'object' &&
          'type' in message &&
          message.type === 'inline-text-admission-result'
        ) {
          admission = message;
        } else {
          postMessage(message);
        }
      });
      try {
        for (const selection of ['iframe', 'header', 'empty']) {
          admission = undefined;
          await page.getByRole('button', { name: 'Fit all', exact: true }).click();
          await frame('Home · Mobile').getByRole('link', { name: 'Ghost', exact: true }).dblClick();
          await expect.poll(() => Boolean(admission)).toBe(true);
          expect((await home.measureLayout(signal)).localEdits.active).toBe(true);
          if (selection === 'iframe') {
            await frame('Post · Mobile').getByRole('link', { name: 'Ghost', exact: true }).click();
          } else if (selection === 'header') {
            await page.getByRole('button', { name: 'Post · Mobile', exact: true }).click();
          } else {
            await page
              .getByRole('region', { name: 'Theme canvas' })
              .click({ position: { x: 10, y: 500 } });
          }
          await expect
            .poll(async () => (await home.measureLayout(signal)).localEdits.active, {
              timeout: 1500,
            })
            .toBe(false);
          postMessage(admission);
          expect((await home.measureLayout(signal)).localEdits.active).toBe(false);
          if (selection === 'iframe') {
            expect(
              document.querySelector('[data-source-selection]')?.parentElement?.textContent,
            ).toContain('Post · Mobile');
          }
        }
      } finally {
        heldAdmission.mockRestore();
      }
      holdIncoming = true;
      try {
        await page.getByRole('button', { name: 'Fit all', exact: true }).click();
        await frame('Home · Mobile').getByRole('link', { name: 'Ghost', exact: true }).dblClick();
        await expect
          .poll(() =>
            heldRequests.some(
              (event) => (event.data as { type: string }).type === 'inline-text-admission',
            ),
          )
          .toBe(true);
        expect((await home.measureLayout(signal)).localEdits.active).toBe(true);
        await page.getByRole('button', { name: 'Post · Mobile', exact: true }).click();
        holdIncoming = false;
        for (const event of heldRequests) {
          window.dispatchEvent(
            new MessageEvent('message', { data: event.data, source: event.source }),
          );
        }
        expect((await home.measureLayout(signal)).localEdits.active).toBe(false);
        await expect
          .element(page.getByRole('button', { name: 'Post · Mobile', exact: true }))
          .toHaveAttribute('aria-pressed', 'true');
        expect(document.body.textContent).not.toContain('Resume text draft');
      } finally {
        holdIncoming = false;
      }
      await frame('Home · Mobile').getByRole('link', { name: 'Ghost', exact: true }).click();
      await userEvent.keyboard('{Enter}');
      await expect
        .poll(async () => (await home.measureLayout(signal)).localEdits.active)
        .toBe(true);
      await page.getByRole('button', { name: 'Cancel text draft', exact: true }).click();
      await expect
        .poll(async () => (await home.measureLayout(signal)).localEdits.active)
        .toBe(false);
      const other = devices.get('post-mobile')!;
      // A delayed selection or Escape must not cancel a newer keyboard admission.
      // Focus is delivered inside the opaque fixture, without generating a click.
      for (const olderIntent of ['selection', 'escape']) {
        olderIntents.length = 0;
        await page.getByRole('button', { name: 'Fit all', exact: true }).click();
        holdOlderIntent = true;
        await frame('Post · Mobile').getByRole('link', { name: 'Ghost', exact: true }).click();
        if (olderIntent === 'escape') {
          await userEvent.keyboard('{Escape}');
        }
        await expect
          .poll(() =>
            olderIntents.some((event) => {
              const packet = event.data as { type: string; input?: { kind?: string } };
              return olderIntent === 'selection'
                ? packet.type === 'select'
                : packet.input?.kind === 'escape';
            }),
          )
          .toBe(true);
        holdOlderIntent = false;
        const olderReceipt = olderIntents.find((event) => {
          const packet = event.data as { type: string; input?: { kind?: string } };
          return olderIntent === 'selection'
            ? packet.type === 'select'
            : packet.input?.kind === 'escape';
        })!;
        let keyboardApproval: unknown;
        const holdKeyboardApproval = vi
          .spyOn(port, 'postMessage')
          .mockImplementation((message: unknown) => {
            if (
              message &&
              typeof message === 'object' &&
              'type' in message &&
              message.type === 'inline-text-admission-result'
            ) {
              keyboardApproval = message;
            } else {
              postMessage(message);
            }
          });
        try {
          document
            .querySelector<HTMLIFrameElement>('iframe[title="Home · Mobile composition"]')!
            .contentWindow!.postMessage('test-focus-literal', '*');
          // The bridge command runs after the focus message in the frame event loop.
          await home.measureLayout(signal);
          await userEvent.keyboard('{Enter}');
          await expect.poll(() => Boolean(keyboardApproval)).toBe(true);
          window.dispatchEvent(
            new MessageEvent('message', { data: olderReceipt.data, source: olderReceipt.source }),
          );
          postMessage(keyboardApproval);
          await expect
            .poll(() => text('home-mobile', '[contenteditable="plaintext-only"]'))
            .toBe('Ghost');
          await page.getByRole('button', { name: 'Cancel text draft', exact: true }).click();
          await expect
            .poll(async () => (await home.measureLayout(signal)).localEdits.active)
            .toBe(false);
        } finally {
          holdKeyboardApproval.mockRestore();
          holdOlderIntent = false;
        }
      }
      await frame('Home · Mobile').getByRole('link', { name: 'Ghost', exact: true }).click();
      await expect
        .element(page.getByRole('button', { name: 'Home · Mobile', exact: true }))
        .toHaveAttribute('aria-pressed', 'true');
      await userEvent.keyboard('{Escape}');
      await expect
        .element(page.getByRole('button', { name: 'Home · Mobile', exact: true }))
        .toHaveAttribute('aria-pressed', 'false');
      const originalMode = other.setInteractionMode.bind(other);
      let selectHeld = false;
      const heldMode = new Promise<void>((resolve) => {
        releaseMode = resolve;
      });
      other.setInteractionMode = async (mode, modeSignal) => {
        if (mode === 'select') {
          selectHeld = true;
          await heldMode;
        }
        return originalMode(mode, modeSignal);
      };

      await frame('Home · Mobile').getByRole('link', { name: 'Ghost', exact: true }).dblClick();
      const editor = frame('Home · Mobile').getByRole('textbox', { name: /^Edit Ghost/ });
      await editor.fill('Retained source draft');
      await expect.poll(() => selectHeld).toBe(true);
      expect(document.querySelector('[data-source-selection] pre')?.textContent).toContain(
        'https://ghost.org/',
      );
      const bringToView = async (id: string) => {
        const box = (
          await devices
            .get(id)!
            .inspectElement({ selector: 'a[href="https://ghost.org/"]' }, signal)
        ).box;
        const card = document.querySelector(`[data-canvas-frame="${id}"]`)!.getBoundingClientRect();
        const board = page.getByRole('region', { name: 'Theme canvas' }).element();
        const canvas = board.getBoundingClientRect();
        const scale = card.width / (id.endsWith('mobile') ? 390 : 1440);
        board.dispatchEvent(
          new WheelEvent('wheel', {
            bubbles: true,
            deltaX: card.x + (box.x + box.width / 2) * scale - (canvas.x + canvas.width / 2),
            deltaY: card.y + (box.y + box.height / 2) * scale - (canvas.y + canvas.height / 2),
          }),
        );
      };
      await page.getByRole('button', { name: 'Fit Post', exact: true }).click();
      await bringToView('post-mobile');
      await frame('Post · Mobile').getByRole('link', { name: 'Ghost', exact: true }).dblClick();
      expect((await devices.get('post-mobile')!.measureLayout(signal)).localEdits.active).toBe(
        false,
      );
      expect(await text('home-mobile', '[contenteditable="plaintext-only"]')).toBe(
        'Retained source draft',
      );
      releaseMode();
      other.setInteractionMode = originalMode;
      await expect
        .element(page.getByRole('button', { name: 'Resume text draft', exact: true }))
        .toBeVisible();
      await page.getByRole('button', { name: 'Resume text draft', exact: true }).click();
      // Opaque frames are asserted through their real bridge; parent DOM matchers
      // cannot inspect their content even though trusted browser actions can.
      expect(await text('home-mobile', '[contenteditable="plaintext-only"]')).toBe(
        'Retained source draft',
      );
      await editor.click();
      await userEvent.keyboard('{Enter}');
      await expect
        .poll(
          () => {
            const renderedDevices = Array.from(
              document.querySelectorAll('[data-composition-revision],[data-fixture-revision]'),
            );
            return (
              renderedDevices.length === 8 &&
              renderedDevices.every((element) =>
                (
                  element.getAttribute('data-composition-revision') ??
                  element.getAttribute('data-fixture-revision')
                )?.endsWith(':edit-1'),
              )
            );
          },
          { timeout: 30_000 },
        )
        .toBe(true);
      expect([...devices.entries()]).toEqual(originalDevices);
      expect(document.querySelector('[data-source-selection]')).toBeNull();
      for (const [id, device] of devices) {
        expect(await text(id, 'a[href="https://ghost.org/"]')).toBe('Retained source draft');
        expect((await device.measureLayout(signal)).localEdits.active).toBe(false);
      }
      await bringToView('home-mobile');
      await frame('Home · Mobile')
        .getByRole('link', { name: 'Retained source draft', exact: true })
        .dblClick();
      await frame('Home · Mobile')
        .getByRole('textbox', { name: /^Edit Retained/ })
        .fill('Cancelled second draft');
      await page.getByRole('button', { name: 'Cancel text draft', exact: true }).click();
      await expect
        .poll(() => text('home-mobile', 'a[href="https://ghost.org/"]'))
        .toBe('Retained source draft');
      expect((await devices.get('home-mobile')!.measureLayout(signal)).localEdits.active).toBe(
        false,
      );
    } finally {
      window.removeEventListener('message', holdRequest, true);
      focusFixture.mockRestore();
      releaseMode();
      await screen.unmount();
    }
  },
);
