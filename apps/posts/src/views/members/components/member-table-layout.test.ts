import {describe, expect, it} from 'vitest';

import {getMemberTableLayout} from './member-table-layout';

function expectCloseTo(actual: number, expected: number) {
    expect(actual).toBeCloseTo(expected, 6);
}

describe('member-table-layout', () => {
    it('uses the base desktop ratios when all default columns are visible', () => {
        const layout = getMemberTableLayout({
            showEmailOpenRate: true,
            activeColumnCount: 0
        });

        expect(layout.tableWidthPercentage).toBe(100);
        expect(layout.minTableWidth).toBe(980);
        expect(layout.columns.map(column => column.key)).toEqual([
            'member',
            'status',
            'openRate',
            'location',
            'created'
        ]);

        expectCloseTo(layout.columns[0]!.widthPercentage, 40);
        expect(layout.columns[0]!.minWidth).toBe(320);
        expectCloseTo(layout.columns[1]!.widthPercentage, 15);
        expectCloseTo(layout.columns[2]!.widthPercentage, 10);
        expectCloseTo(layout.columns[3]!.widthPercentage, 17.5);
        expectCloseTo(layout.columns[4]!.widthPercentage, 17.5);
    });

    it('renormalizes the visible base columns when open rate is hidden', () => {
        const layout = getMemberTableLayout({
            showEmailOpenRate: false,
            activeColumnCount: 0
        });

        expect(layout.tableWidthPercentage).toBe(100);
        expect(layout.minTableWidth).toBe(840);
        expect(layout.columns.map(column => column.key)).toEqual([
            'member',
            'status',
            'location',
            'created'
        ]);

        expectCloseTo(layout.columns[0]!.widthPercentage, 44.444444);
        expectCloseTo(layout.columns[1]!.widthPercentage, 16.666667);
        expectCloseTo(layout.columns[2]!.widthPercentage, 19.444444);
        expectCloseTo(layout.columns[3]!.widthPercentage, 19.444444);
    });

    it('adds one dynamic column without compressing the base columns', () => {
        const layout = getMemberTableLayout({
            showEmailOpenRate: true,
            activeColumnCount: 1
        });

        expect(layout.tableWidthPercentage).toBe(117.5);
        expect(layout.minTableWidth).toBe(1200);
        expect(layout.columns.map(column => column.key)).toEqual([
            'member',
            'status',
            'openRate',
            'location',
            'created',
            'dynamic:0'
        ]);

        expectCloseTo(layout.columns[0]!.widthPercentage, 34.042553);
        expectCloseTo(layout.columns[5]!.widthPercentage, 14.893617);
        expect(layout.columns[5]!.minWidth).toBe(220);
        expectCloseTo(layout.dynamicColumnWidthPercentage, 14.893617);
    });

    it('adds two dynamic columns and grows the table width to 135%', () => {
        const layout = getMemberTableLayout({
            showEmailOpenRate: true,
            activeColumnCount: 2
        });

        expect(layout.tableWidthPercentage).toBe(135);
        expect(layout.minTableWidth).toBe(1420);
        expect(layout.columns.map(column => column.key)).toEqual([
            'member',
            'status',
            'openRate',
            'location',
            'created',
            'dynamic:0',
            'dynamic:1'
        ]);

        expectCloseTo(layout.columns[0]!.widthPercentage, 29.62963);
        expectCloseTo(layout.columns[5]!.widthPercentage, 12.962963);
        expectCloseTo(layout.columns[6]!.widthPercentage, 12.962963);
        expectCloseTo(layout.dynamicColumnWidthPercentage, 12.962963);
    });

    it('ignores invalid active column counts', () => {
        expect(getMemberTableLayout({
            showEmailOpenRate: true,
            activeColumnCount: Number.NaN
        }).tableWidthPercentage).toBe(100);

        expect(getMemberTableLayout({
            showEmailOpenRate: true,
            activeColumnCount: -4
        }).columns).toHaveLength(5);
    });
});
