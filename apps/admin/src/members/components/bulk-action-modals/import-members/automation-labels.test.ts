import { describe, expect, it } from 'vitest';
import { countImportAutomationRows, csvAutomationLabelNames } from './automation-labels';

const fileData = [
  { labels: 'VIP, Guide, vip, ', tags: 'Webinar' },
  { labels: ' Guide,New', tags: 'Webinar, VIP' },
];

describe('CSV automation labels', () => {
  it('reads every row, trims names, and deduplicates without regard to case', () => {
    expect(csvAutomationLabelNames({ fileData, mapping: { labels: 'labels', tags: '' } })).toEqual([
      'vip',
      'Guide',
      'New',
    ]);
  });

  it('uses the effective mapping rather than column headers', () => {
    expect(
      csvAutomationLabelNames({ fileData, mapping: { labels: 'note', tags: 'labels' } }),
    ).toEqual(['Webinar', 'VIP']);
  });

  it.each(['', null])('ignores excluded or unmapped label columns (%s)', (target) => {
    expect(
      csvAutomationLabelNames({ fileData, mapping: { labels: target, tags: 'note' } }),
    ).toEqual([]);
  });
});

describe('Automation-affected import rows', () => {
  const matchingLabels = [
    { id: 'vip', name: 'VIP' },
    { id: 'guide', name: 'Guide' },
  ];

  it('counts each matching row once across labels, ignoring case and whitespace', () => {
    expect(
      countImportAutomationRows({
        fileData: [{ labels: ' vip, Guide, VIP ' }, { labels: 'Guide' }, { labels: 'Other' }],
        mapping: { labels: 'labels' },
        selectedLabelIds: [],
        matchingLabels,
      }),
    ).toBe(2);
  });

  it('respects remapped and excluded label columns', () => {
    expect(
      countImportAutomationRows({
        fileData,
        mapping: { labels: 'note', tags: 'labels' },
        selectedLabelIds: [],
        matchingLabels,
      }),
    ).toBe(1);
    expect(
      countImportAutomationRows({
        fileData,
        mapping: { labels: '', tags: 'note' },
        selectedLabelIds: [],
        matchingLabels,
      }),
    ).toBe(0);
  });

  it.each([
    { selectedLabelIds: ['vip'], expected: 3 },
    { selectedLabelIds: ['unrelated'], expected: 1 },
  ])(
    'counts all rows only for an affected picker label ($selectedLabelIds)',
    ({ selectedLabelIds, expected }) => {
      expect(
        countImportAutomationRows({
          fileData: Array.from({ length: 3 }, (_, index) => ({
            labels: index === 0 ? 'VIP' : 'Other',
          })),
          mapping: { labels: 'labels' },
          selectedLabelIds,
          matchingLabels,
        }),
      ).toBe(expected);
    },
  );

  it('combines affected rows across different automation labels', () => {
    expect(
      countImportAutomationRows({
        fileData: Array.from({ length: 4 }, (_, index) => ({
          labels: index < 2 ? 'VIP' : 'Guide',
        })),
        mapping: { labels: 'labels' },
        selectedLabelIds: [],
        matchingLabels,
      }),
    ).toBe(4);
  });
});
