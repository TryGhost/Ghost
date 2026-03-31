import {Table, TableHead, TableHeader, TableRow, cn} from '@tryghost/shade';
import type {ActiveColumn} from '../member-query-params';
import type {CSSProperties, Ref} from 'react';
import type {MemberTableColumnStyles} from './member-table-layout';

const PINNED_EDGE_FADE_STYLE = {
    left: '100%',
    background: 'linear-gradient(to right, var(--members-sticky-fade-base) 0px, color-mix(in hsl, var(--members-sticky-fade-base) 78%, transparent) 6px, color-mix(in hsl, var(--members-sticky-fade-base) 28%, transparent) 16px, transparent 24px)'
} as CSSProperties;

export const MembersTableColGroup = ({
    activeColumns,
    columnStyles,
    showEmailOpenRate
}: {
    activeColumns: ActiveColumn[];
    columnStyles: MemberTableColumnStyles;
    showEmailOpenRate: boolean;
}) => {
    return (
        <colgroup>
            <col style={columnStyles.member} />
            <col style={columnStyles.status} />
            {showEmailOpenRate && <col style={columnStyles.openRate} />}
            <col style={columnStyles.location} />
            <col style={columnStyles.created} />
            {activeColumns.map(col => (
                <col key={col.key} style={columnStyles.dynamic} />
            ))}
        </colgroup>
    );
};

export const MembersTableHeader = ({
    activeColumns,
    className,
    columnStyles,
    headerRef,
    memberHeaderRef,
    showEmailOpenRate
}: {
    activeColumns: ActiveColumn[];
    className?: string;
    columnStyles: MemberTableColumnStyles;
    headerRef?: Ref<HTMLTableSectionElement>;
    memberHeaderRef?: Ref<HTMLTableCellElement>;
    showEmailOpenRate: boolean;
}) => {
    return (
        <TableHeader
            ref={headerRef}
            className={cn('hidden bg-transparent lg:table-header-group', className)}
        >
            <TableRow>
                <TableHead
                    ref={memberHeaderRef}
                    className="sticky left-0 z-[70] bg-transparent px-4 py-3 [--members-sticky-fade-base:var(--background)]"
                    style={columnStyles.member}
                >
                    Member
                </TableHead>
                <TableHead className="bg-transparent px-4 py-3" style={columnStyles.status}>
                    Status
                </TableHead>
                {showEmailOpenRate && (
                    <TableHead className="bg-transparent px-4 py-3" style={columnStyles.openRate}>
                        Open rate
                    </TableHead>
                )}
                <TableHead className="bg-transparent px-4 py-3" style={columnStyles.location}>
                    Location
                </TableHead>
                <TableHead className="bg-transparent px-4 py-3" style={columnStyles.created}>
                    Created
                </TableHead>
                {activeColumns.map(col => (
                    <TableHead key={col.key} className="bg-transparent px-4 py-3" style={columnStyles.dynamic}>
                        {col.label}
                    </TableHead>
                ))}
            </TableRow>
        </TableHeader>
    );
};

export const PinnedMemberHeader = ({
    columnStyle,
    showPinnedEdge
}: {
    columnStyle: CSSProperties;
    showPinnedEdge: boolean;
}) => {
    return (
        <div
            className="pointer-events-none absolute inset-y-0 left-0 z-[70] overflow-visible bg-transparent [--members-sticky-fade-base:var(--background)]"
            style={columnStyle}
        >
            <Table className="w-full table-fixed border-collapse">
                <colgroup>
                    <col style={{width: '100%'}} />
                </colgroup>
                <TableHeader className="bg-transparent lg:table-header-group">
                    <TableRow>
                        <TableHead className="bg-transparent px-4 py-3">
                            Member
                        </TableHead>
                    </TableRow>
                </TableHeader>
            </Table>
            {showPinnedEdge && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-px w-[24px]"
                    style={PINNED_EDGE_FADE_STYLE}
                />
            )}
        </div>
    );
};
