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
  it('selects a frame without moving the camera, opens it readably, and returns to the saved overview', () => {
    render(<CanvasBoard frames={frames} renderFrame={(frame) => <iframe title={frame.label} />} />);
    const world = screen.getByTestId('canvas-world');
    const overview = world.style.transform;
    const header = screen.getByRole('button', { name: 'Home · Mobile' });
    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-pressed', 'true');
    expect(world.style.transform).toBe(overview);
    fireEvent.doubleClick(header);
    expect(world.style.transform).not.toBe(overview);
    expect(screen.getByRole('button', { name: 'Back to overview' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Back to overview' }));
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

  it('offers keyboard opening and a camera escape without relying on iframe input', () => {
    render(<CanvasBoard frames={frames} renderFrame={(frame) => <iframe title={frame.label} />} />);
    const header = screen.getByRole('button', { name: 'Post · Mobile' });
    fireEvent.keyDown(header, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Back to overview' })).toBeVisible();
    fireEvent.keyDown(screen.getByRole('region', { name: 'Theme canvas' }), { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Back to overview' })).toBeNull();
  });

  it('restores keyboard focus to the board when returning from an opened frame', () => {
    render(<CanvasBoard frames={frames} renderFrame={(frame) => <iframe title={frame.label} />} />);
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Home · Mobile' }));
    const back = screen.getByRole('button', { name: 'Back to overview' });
    back.focus();
    fireEvent.click(back);
    expect(screen.getByRole('region', { name: 'Theme canvas' })).toHaveFocus();
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

  it('keeps dragging available over empty canvas space after opening a frame', () => {
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
