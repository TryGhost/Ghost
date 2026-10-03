import { describe, expect, it, vi } from 'vitest';

import { captureOverview, OVERVIEW_CAPTURE_LIMITS } from './capture-overview';
import type { ScreenshotRequest } from '@/builder/workspaces/theme/preview/screenshot';

const layout = {
  documentId: 'device-document-1',
  documentInstanceId: 'device-instance-1',
  localEdits: { generation: 0, active: false, changed: false },
  viewport: { width: 390, height: 844, scrollX: 0, scrollY: 123 },
  document: { width: 390, height: 10_000 },
};

function preview(height = layout.document.height) {
  return {
    measureLayout: vi.fn().mockResolvedValue({ ...layout, document: { width: 390, height } }),
    screenshot: vi.fn((request: ScreenshotRequest) => {
      if (request.kind !== 'region') {
        throw new Error('Expected a bounded region');
      }
      return Promise.resolve({
        dataUrl: 'data:image/png;base64,AAAA',
        width: request.width,
        height: request.height,
        warnings: ['External imagery omitted'],
      });
    }),
  };
}

describe('bounded composition captures', () => {
  it('does not certify an uncommitted local draft as the rendered revision', async () => {
    const surface = preview();
    surface.measureLayout.mockResolvedValue({
      ...layout,
      localEdits: { generation: 1, active: true, changed: false },
    });
    await expect(
      captureOverview(surface, 'home-mobile', 'revision-1', new AbortController().signal),
    ).rejects.toThrow('local');
    expect(surface.screenshot).not.toHaveBeenCalled();
  });

  it('rejects a draft that starts and cancels during capture even if geometry is unchanged', async () => {
    const surface = preview();
    surface.measureLayout.mockResolvedValueOnce(layout).mockResolvedValue({
      ...layout,
      localEdits: { generation: 2, active: false, changed: false },
    });
    await expect(
      captureOverview(surface, 'home-mobile', 'revision-1', new AbortController().signal),
    ).rejects.toThrow('changed');
  });

  it('rejects a restored runtime instance even when the rendered revision and geometry match', async () => {
    const surface = preview();
    surface.measureLayout
      .mockResolvedValueOnce(layout)
      .mockResolvedValue({ ...layout, documentInstanceId: 'restored-instance' });
    await expect(
      captureOverview(surface, 'home-mobile', 'revision-1', new AbortController().signal),
    ).rejects.toThrow('changed');
  });
  it('covers a tall page with contiguous device-width tiles and explicit backing context', async () => {
    const surface = preview();
    const result = await captureOverview(
      surface,
      'home-mobile',
      'revision-1',
      new AbortController().signal,
    );
    expect(result.frameId).toBe('home-mobile');
    expect(result.revision).toBe('revision-1');
    expect(result.viewport).toEqual(layout.viewport);
    expect(result.documentHeight).toBe(10_000);
    expect(result.coveredHeight).toBe(10_000);
    expect(result.complete).toBe(true);
    expect(result.warnings).toEqual(['External imagery omitted']);
    let y = 0;
    for (const tile of result.tiles) {
      expect(tile.y).toBe(y);
      expect(tile.width).toBe(390);
      expect(tile.height).toBeLessThanOrEqual(OVERVIEW_CAPTURE_LIMITS.tileHeight);
      y += tile.height;
    }
    expect(y).toBe(10_000);
    expect(surface.screenshot.mock.calls[0][0]).toMatchObject({ kind: 'region', x: 0, y: 0 });
  });

  it('reports partial geometric coverage without shrinking the full document bounds', async () => {
    const result = await captureOverview(
      preview(100_000),
      'post-mobile',
      'revision-2',
      new AbortController().signal,
    );
    expect(result.documentHeight).toBe(100_000);
    expect(result.complete).toBe(false);
    expect(result.tiles).toHaveLength(OVERVIEW_CAPTURE_LIMITS.maxTiles);
    expect(result.coveredHeight).toBe(
      OVERVIEW_CAPTURE_LIMITS.tileHeight * OVERVIEW_CAPTURE_LIMITS.maxTiles,
    );
    expect(result.warnings.join(' ')).toContain('not captured');
  });

  it('does not adopt captures if the backing layout changes during the sequence', async () => {
    const surface = preview();
    surface.measureLayout
      .mockResolvedValueOnce(layout)
      .mockResolvedValue({ ...layout, document: { width: 390, height: 10_100 } });
    await expect(
      captureOverview(surface, 'home-mobile', 'revision-1', new AbortController().signal),
    ).rejects.toThrow('changed');
  });

  it('stops at the aggregate encoded-output budget and identifies the omitted region', async () => {
    const surface = preview();
    surface.screenshot.mockResolvedValue({
      dataUrl: 'a'.repeat(OVERVIEW_CAPTURE_LIMITS.maxCharacters),
      width: 390,
      height: OVERVIEW_CAPTURE_LIMITS.tileHeight,
      warnings: [],
    });
    const result = await captureOverview(
      surface,
      'home-mobile',
      'revision-1',
      new AbortController().signal,
    );
    expect(result.tiles).toHaveLength(1);
    expect(result.complete).toBe(false);
    expect(result.warnings.join(' ')).toContain('output budget');
  });

  it('rejects stale prior tiles when an oversized final tile changes the document', async () => {
    const surface = preview();
    surface.screenshot
      .mockResolvedValueOnce({
        dataUrl: 'data:image/png;base64,AAAA',
        width: 390,
        height: OVERVIEW_CAPTURE_LIMITS.tileHeight,
        warnings: [],
      })
      .mockImplementationOnce(() => {
        surface.measureLayout.mockResolvedValue({ ...layout, documentId: 'replacement-document' });
        return Promise.resolve({
          dataUrl: 'a'.repeat(OVERVIEW_CAPTURE_LIMITS.maxCharacters),
          width: 390,
          height: OVERVIEW_CAPTURE_LIMITS.tileHeight,
          warnings: [],
        });
      });
    await expect(
      captureOverview(surface, 'home-mobile', 'revision-1', new AbortController().signal),
    ).rejects.toThrow('changed');
  });

  it('rejects work cancelled while a capture ignores its signal', async () => {
    const controller = new AbortController();
    const surface = preview();
    surface.screenshot.mockImplementation((request) => {
      if (request.kind !== 'region') {
        throw new Error('Expected a bounded region');
      }
      controller.abort();
      return Promise.resolve({
        dataUrl: 'data:image/png;base64,AAAA',
        width: request.width,
        height: request.height,
        warnings: [],
      });
    });
    await expect(
      captureOverview(surface, 'home-mobile', 'revision-1', controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
