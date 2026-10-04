import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1200);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('canvas board', () => {
  it('keeps every template control inside a height-dominated overview', () => {
    const templates = ['Home', 'Post', 'Page', 'Tag', 'Author'];
    const tall = templates.flatMap((group, index) =>
      ['Desktop', 'Mobile'].map((device) => ({
        id: `${group}-${device}`,
        label: `${group} · ${device}`,
        group,
        x: (index % 2) * 1974 + (device === 'Mobile' ? 1488 : 0),
        y: index < 2 ? 0 : index < 4 ? 1028 : 29156,
        width: device === 'Desktop' ? 1440 : 390,
        height: group === 'Page' ? (device === 'Desktop' ? 24000 : 28000) : 900,
      })),
    );
    render(
      <CanvasBoard
        frames={tall}
        renderFrame={() => null}
        renderFrameActions={() => <button type="button">Content</button>}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Fit all' }));
    for (const frame of tall) {
      const header = screen.getByRole('button', { name: frame.label }).parentElement!;
      expect(parseFloat(header.style.left)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(header.style.left) + 234).toBeLessThanOrEqual(1200);
      expect(parseFloat(header.style.top)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(header.style.top) + 32).toBeLessThanOrEqual(800);
      expect(screen.getByRole('button', { name: frame.label })).not.toHaveAttribute('inert');
    }
  });

  it('keeps live composition dimensions and documents when a header fits the camera', () => {
    const compositions = frames.map((frame) => ({
      ...frame,
      viewport: { width: frame.width, height: frame.height },
      height: 10_000,
    }));
    render(
      <CanvasBoard frames={compositions} renderFrame={(frame) => <iframe title={frame.label} />} />,
    );
    const device = screen.getByTitle('Home · Mobile');
    const host = device.parentElement;
    expect(host).not.toHaveAttribute('inert');
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Home · Mobile' }));
    expect(host).toHaveStyle({ height: '10000px', width: '390px' });
    expect(screen.getByTitle('Home · Mobile')).toBe(device);
    expect(screen.queryByRole('button', { name: 'Back to overview' })).toBeNull();
  });

  it('fits initial composition bounds once when ready and respects navigation before readiness', () => {
    const renderer = (frame: (typeof frames)[number]) => <iframe title={frame.label} />;
    const { rerender } = render(
      <CanvasBoard frames={frames} initialFitReady={false} renderFrame={renderer} />,
    );
    const world = screen.getByTestId('canvas-world');
    expect(world.style.transform).toBe('translate(0px, 0px) scale(1)');
    fireEvent.wheel(screen.getByRole('region', { name: 'Theme canvas' }), {
      deltaX: 40,
      deltaY: 10,
    });
    const moved = world.style.transform;
    rerender(
      <CanvasBoard
        frames={frames.map((frame) => ({ ...frame, height: 10_000 }))}
        renderFrame={renderer}
        initialFitReady
      />,
    );
    expect(world.style.transform).toBe(moved);
  });

  it('selects without moving the camera and fits in place without changing editing mode', () => {
    render(<CanvasBoard frames={frames} renderFrame={(frame) => <iframe title={frame.label} />} />);
    const world = screen.getByTestId('canvas-world');
    const overview = world.style.transform;
    const header = screen.getByRole('button', { name: 'Home · Mobile' });
    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-pressed', 'true');
    expect(world.style.transform).toBe(overview);
    fireEvent.doubleClick(header);
    expect(world.style.transform).not.toBe(overview);
    expect(document.querySelector('[data-canvas-frame][inert]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Fit all' }));
    expect(world.style.transform).toBe(overview);
  });

  it('zooms and pans over previews while keeping their mounted DOM and declared dimensions', () => {
    render(<CanvasBoard frames={frames} renderFrame={(frame) => <iframe title={frame.label} />} />);
    const board = screen.getByRole('region', { name: 'Theme canvas' });
    const world = screen.getByTestId('canvas-world');
    const frame = screen.getByTitle('Home · Desktop');
    const host = frame.parentElement;
    const before = world.style.transform;
    fireEvent.wheel(board, { deltaY: -150, ctrlKey: true, clientX: 500, clientY: 300 });
    expect(world.style.transform).not.toBe(before);
    const zoomed = world.style.transform;
    fireEvent.wheel(board, { deltaX: 50, deltaY: 80 });
    expect(world.style.transform).not.toBe(zoomed);
    expect(screen.getByTitle('Home · Desktop')).toBe(frame);
    expect(host).toHaveStyle({ width: '1440px', height: '900px' });
  });

  it('offers keyboard camera fits and Escape clears selection without changing documents', () => {
    render(<CanvasBoard frames={frames} renderFrame={(frame) => <iframe title={frame.label} />} />);
    const header = screen.getByRole('button', { name: 'Post · Mobile' });
    const frame = screen.getByTitle('Post · Mobile');
    fireEvent.keyDown(header, { key: 'Enter' });
    expect(header).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(screen.getByRole('region', { name: 'Theme canvas' }), { key: 'Escape' });
    expect(header).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTitle('Post · Mobile')).toBe(frame);
  });

  it('ignores click jitter and recognizes a slow drag by its total displacement', () => {
    render(<CanvasBoard frames={frames} renderFrame={(frame) => <iframe title={frame.label} />} />);
    const board = screen.getByRole('region', { name: 'Theme canvas' });
    board.setPointerCapture = vi.fn();
    const world = screen.getByTestId('canvas-world');
    const before = world.style.transform;
    const pointer = (type: string, x: number) =>
      fireEvent(
        board,
        new MouseEvent(type, { bubbles: true, clientX: x, clientY: 400, button: 0 }),
      );
    pointer('pointerdown', 400);
    pointer('pointermove', 401);
    pointer('pointerup', 401);
    expect(world.style.transform).toBe(before);
    pointer('pointerdown', 400);
    for (let x = 401; x <= 410; x++) {
      pointer('pointermove', x);
    }
    pointer('pointerup', 410);
    expect(world.style.transform).not.toBe(before);
  });

  it('keeps dragging available over empty canvas space after fitting a frame', () => {
    render(<CanvasBoard frames={frames} renderFrame={(frame) => <iframe title={frame.label} />} />);
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Home · Mobile' }));
    const board = screen.getByRole('region', { name: 'Theme canvas' });
    board.setPointerCapture = vi.fn();
    const world = screen.getByTestId('canvas-world');
    const before = world.style.transform;
    fireEvent(
      board,
      new MouseEvent('pointerdown', { bubbles: true, clientX: 80, clientY: 400, button: 0 }),
    );
    fireEvent(board, new MouseEvent('pointermove', { bubbles: true, clientX: 140, clientY: 450 }));
    fireEvent(board, new MouseEvent('pointerup', { bubbles: true, clientX: 140, clientY: 450 }));
    expect(world.style.transform).not.toBe(before);
  });
});
