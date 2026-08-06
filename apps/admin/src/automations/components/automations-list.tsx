import AutomationStatusBadge from './automation-status-badge';
import React from 'react';
import type {Automation} from '@tryghost/admin-x-framework/api/automations';
import {Skeleton, Table, TableBody, TableCell, TableRow} from '@tryghost/shade/components';
import {Link} from '@tryghost/admin-x-framework';
import {LucideIcon} from '@tryghost/shade/utils';
import {useMailgunNotConnected} from '@/automations/hooks/use-mailgun-alert';

const AUTOMATION_DESCRIPTIONS: Record<string, string> = {
    'member-welcome-email-free': 'Welcome new free members after they sign up.',
    'member-welcome-email-paid': 'Welcome new paid members after they start their subscription.'
};

interface AutomationsListProps {
    automations?: Automation[];
    isLoading?: boolean;
}

const AutomationsListSkeleton: React.FC = () => {
    return (
        <Table className="flex flex-col border-t" data-testid="automations-list-loading">
            <TableBody className="flex flex-col">
                {Array.from({length: 2}, (_, index) => (
                    <TableRow
                        key={index}
                        aria-hidden="true"
                        className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 p-2 lg:p-0"
                    >
                        <TableCell className="min-w-0 lg:p-4">
                            <Skeleton className="mb-1 h-3 w-48 max-w-full " />
                            <Skeleton className="h-3 w-80 max-w-full" />
                        </TableCell>
                        <TableCell className="text-right lg:w-32 lg:p-4">
                            <Skeleton className="ml-auto h-3 w-16" />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

const AutomationsList: React.FC<AutomationsListProps> = ({automations = [], isLoading = false}) => {
    // Mailgun is a site-wide connection, so when it's missing every email automation is affected —
    // surface it on each row here (mirrors the editor alert) so the need for attention is visible from
    // the landing page.
    const mailgunNotConnected = useMailgunNotConnected();

    if (isLoading) {
        return <AutomationsListSkeleton />;
    }

    return (
        <Table className="flex flex-col border-t" data-testid="automations-list">
            <TableBody className="flex flex-col">
                {automations.map((automation) => {
                    const description = AUTOMATION_DESCRIPTIONS[automation.slug];

                    return (
                        <TableRow
                            key={automation.slug}
                            className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 p-2 hover:bg-table-row-hover lg:p-0"
                            data-testid="automation-list-row"
                        >
                            <TableCell className="static min-w-0 lg:p-4">
                                <Link
                                    className="before:absolute before:inset-0 before:z-10 before:rounded-sm focus-visible:outline-hidden focus-visible:before:ring-2 focus-visible:before:ring-focus-ring"
                                    to={`/automations/${automation.id}`}
                                >
                                    <span className="block text-md font-semibold">
                                        {automation.name}
                                    </span>
                                </Link>
                                {description && (
                                    <span className="block text-muted-foreground">
                                        {description}
                                    </span>
                                )}
                            </TableCell>
                            <TableCell className="lg:w-32 lg:p-4">
                                <div className="flex items-center justify-end gap-4">
                                    {mailgunNotConnected && (
                                        <LucideIcon.CircleAlert
                                            aria-label="Mailgun not connected"
                                            className="size-5 shrink-0 text-destructive"
                                            strokeWidth={2}
                                        />
                                    )}
                                    <AutomationStatusBadge status={automation.status} />
                                </div>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
};

export default AutomationsList;
