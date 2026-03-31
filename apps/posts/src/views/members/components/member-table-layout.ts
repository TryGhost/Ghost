const BASE_MEMBER_TABLE_COLUMN_WIDTHS = {
    member: 40,
    status: 15,
    openRate: 10,
    location: 17.5,
    created: 17.5
} as const;

const BASE_MEMBER_TABLE_COLUMN_MIN_WIDTHS = {
    member: 320,
    status: 180,
    openRate: 140,
    location: 180,
    created: 160
} as const;

const DYNAMIC_MEMBER_TABLE_COLUMN_WIDTH = 17.5;
const DYNAMIC_MEMBER_TABLE_COLUMN_MIN_WIDTH = 220;

type BaseMemberTableColumnKey = keyof typeof BASE_MEMBER_TABLE_COLUMN_WIDTHS;

export interface MemberTableLayoutColumn {
    key: BaseMemberTableColumnKey | `dynamic:${number}`;
    widthPercentage: number;
    minWidth: number;
}

export interface MemberTableLayout {
    tableWidthPercentage: number;
    minTableWidth: number;
    columns: MemberTableLayoutColumn[];
    dynamicColumnWidthPercentage: number;
    baseColumnWidthPercentages: Record<BaseMemberTableColumnKey, number>;
    baseColumnMinWidths: Record<BaseMemberTableColumnKey, number>;
    dynamicColumnMinWidth: number;
}

function getNormalizedActiveColumnCount(activeColumnCount: number) {
    if (!Number.isFinite(activeColumnCount)) {
        return 0;
    }

    return Math.max(0, Math.floor(activeColumnCount));
}

export function getMemberTableLayout({
    showEmailOpenRate,
    activeColumnCount
}: {
    showEmailOpenRate: boolean;
    activeColumnCount: number;
}): MemberTableLayout {
    const visibleBaseColumns: Array<{key: BaseMemberTableColumnKey; width: number}> = [
        {
            key: 'member',
            width: BASE_MEMBER_TABLE_COLUMN_WIDTHS.member
        },
        {
            key: 'status',
            width: BASE_MEMBER_TABLE_COLUMN_WIDTHS.status
        },
        ...(showEmailOpenRate ? [{
            key: 'openRate' as const,
            width: BASE_MEMBER_TABLE_COLUMN_WIDTHS.openRate
        }] : []),
        {
            key: 'location',
            width: BASE_MEMBER_TABLE_COLUMN_WIDTHS.location
        },
        {
            key: 'created',
            width: BASE_MEMBER_TABLE_COLUMN_WIDTHS.created
        }
    ];

    const normalizedActiveColumnCount = getNormalizedActiveColumnCount(activeColumnCount);
    const totalVisibleBaseWidth = visibleBaseColumns.reduce((total, column) => total + column.width, 0);
    const totalTableWidth =
        100 + (normalizedActiveColumnCount * DYNAMIC_MEMBER_TABLE_COLUMN_WIDTH);

    const columns = visibleBaseColumns.map((column) => {
        const normalizedBaseWidth = (column.width / totalVisibleBaseWidth) * 100;

        return {
            key: column.key,
            widthPercentage: (normalizedBaseWidth / totalTableWidth) * 100,
            minWidth: BASE_MEMBER_TABLE_COLUMN_MIN_WIDTHS[column.key]
        };
    });

    const minTableWidth =
        visibleBaseColumns.reduce((total, column) => total + BASE_MEMBER_TABLE_COLUMN_MIN_WIDTHS[column.key], 0) +
        (normalizedActiveColumnCount * DYNAMIC_MEMBER_TABLE_COLUMN_MIN_WIDTH);

    return {
        tableWidthPercentage: totalTableWidth,
        minTableWidth,
        columns: [
            ...columns,
            ...Array.from({length: normalizedActiveColumnCount}, (_, index) => ({
                key: `dynamic:${index}` as const,
                widthPercentage: (DYNAMIC_MEMBER_TABLE_COLUMN_WIDTH / totalTableWidth) * 100,
                minWidth: DYNAMIC_MEMBER_TABLE_COLUMN_MIN_WIDTH
            }))
        ],
        dynamicColumnWidthPercentage: (DYNAMIC_MEMBER_TABLE_COLUMN_WIDTH / totalTableWidth) * 100,
        baseColumnWidthPercentages: {
            member: columns.find(column => column.key === 'member')?.widthPercentage ?? 0,
            status: columns.find(column => column.key === 'status')?.widthPercentage ?? 0,
            openRate: columns.find(column => column.key === 'openRate')?.widthPercentage ?? 0,
            location: columns.find(column => column.key === 'location')?.widthPercentage ?? 0,
            created: columns.find(column => column.key === 'created')?.widthPercentage ?? 0
        },
        baseColumnMinWidths: {
            member: BASE_MEMBER_TABLE_COLUMN_MIN_WIDTHS.member,
            status: BASE_MEMBER_TABLE_COLUMN_MIN_WIDTHS.status,
            openRate: BASE_MEMBER_TABLE_COLUMN_MIN_WIDTHS.openRate,
            location: BASE_MEMBER_TABLE_COLUMN_MIN_WIDTHS.location,
            created: BASE_MEMBER_TABLE_COLUMN_MIN_WIDTHS.created
        },
        dynamicColumnMinWidth: DYNAMIC_MEMBER_TABLE_COLUMN_MIN_WIDTH
    };
}
