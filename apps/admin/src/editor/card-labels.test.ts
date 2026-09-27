import { describe, expect, it, vi } from 'vitest';
import { type LabelsPage, fetchAllLabelNames } from './card-labels';

function labelsPage(names: string[], page: number, pages: number): LabelsPage {
  return {
    labels: names.map((name) => ({ name })),
    meta: {
      pagination: {
        page,
        limit: 100,
        pages,
        total: names.length,
        next: page < pages ? page + 1 : null,
        prev: page > 1 ? page - 1 : null,
      },
    },
  };
}

function params(url: string) {
  return Object.fromEntries(new URL(url).searchParams);
}

describe('fetchAllLabelNames', () => {
  it('asks for one explicit page of names', async () => {
    const fetchPage = vi.fn().mockResolvedValue(labelsPage(['VIP', 'Beta'], 1, 1));

    await expect(fetchAllLabelNames(fetchPage)).resolves.toEqual(['VIP', 'Beta']);

    expect(fetchPage).toHaveBeenCalledOnce();
    const url = fetchPage.mock.calls[0][0] as string;
    expect(new URL(url).pathname).toMatch(/\/labels\/$/);
    expect(params(url)).toEqual({ limit: '100', fields: 'id,name', page: '1' });
  });

  it('follows the next page until the last one, keeping server order', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(labelsPage(['A'], 1, 3))
      .mockResolvedValueOnce(labelsPage(['B'], 2, 3))
      .mockResolvedValueOnce(labelsPage(['C'], 3, 3));

    await expect(fetchAllLabelNames(fetchPage)).resolves.toEqual(['A', 'B', 'C']);

    expect(fetchPage.mock.calls.map(([url]) => params(url as string).page)).toEqual([
      '1',
      '2',
      '3',
    ]);
  });

  it('does not request an eleventh page when the server offers more', async () => {
    const fetchPage = vi.fn((url: string) => {
      const page = Number(params(url).page);
      return Promise.resolve(labelsPage([`Label ${page}`], page, 12));
    });

    const names = await fetchAllLabelNames(fetchPage);

    expect(names).toHaveLength(10);
    expect(fetchPage.mock.calls.map(([url]) => params(url).page)).toEqual(
      Array.from({ length: 10 }, (_, index) => String(index + 1)),
    );
  });

  it('stops after one page when the response has no pagination', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ labels: [{ name: 'VIP' }] });

    await expect(fetchAllLabelNames(fetchPage)).resolves.toEqual(['VIP']);
    expect(fetchPage).toHaveBeenCalledOnce();
  });

  it('rejects when a later page fails', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(labelsPage(['A'], 1, 2))
      .mockRejectedValueOnce(new Error('offline'));

    await expect(fetchAllLabelNames(fetchPage)).rejects.toThrow('offline');
  });
});
