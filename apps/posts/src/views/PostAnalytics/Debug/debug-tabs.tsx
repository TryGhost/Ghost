import React from 'react';
import {AnalyticsStatusData, BatchRow, EmailSettingsData, FailureRow} from './debug-data';
import {Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {Link} from '@tryghost/admin-x-framework';
import {formatNumber} from '@tryghost/shade/utils';

// Presentational tabs for the post email debug screen. Pure render of
// already-mapped data so it can be unit tested without network mocks.

interface CustomScheduleState {
    show: boolean;
    begin: string;
    end: string;
}

export interface DebugTabsProps {
    permanentFailures: FailureRow[];
    temporaryFailures: FailureRow[];
    batches: BatchRow[];
    emailSettings: EmailSettingsData;
    analyticsStatus: AnalyticsStatusData | null;
    customSchedule: CustomScheduleState;
    onToggleCustomSchedule: () => void;
    onCustomScheduleChange: (changes: Partial<Pick<CustomScheduleState, 'begin' | 'end'>>) => void;
    onScheduleAnalytics: () => void;
    onCancelScheduledAnalytics: () => void;
}

function pluralize(count: number, singular: string, plural: string) {
    return count === 1 ? singular : plural;
}

const MemberCell: React.FC<{failure: FailureRow}> = ({failure}) => {
    const details = (
        <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700">
                {failure.recipient.initials}
            </div>
            <div className="min-w-0">
                <div className="truncate font-semibold" title={failure.recipient.name}>{failure.recipient.name}</div>
                <div className="truncate text-sm text-gray-700" title={failure.recipient.email}>{failure.recipient.email}</div>
            </div>
        </div>
    );

    if (failure.member.id) {
        return <Link to={`/members/${failure.member.id}`}>{details}</Link>;
    }

    return details;
};

const FailuresTable: React.FC<{failures: FailureRow[]; emptyMessage: string; testId: string}> = ({failures, emptyMessage, testId}) => (
    <Table data-testid={testId}>
        <TableBody>
            {failures.map(failure => (
                <TableRow key={failure.id} data-testid={`${testId}-row`}>
                    <TableCell className="w-1/3 align-top">
                        <MemberCell failure={failure} />
                    </TableCell>
                    <TableCell className="align-top">
                        <div className="flex flex-wrap gap-4 text-sm">
                            <span>Failure code: <strong>{failure.code}</strong></span>
                            {failure.enhancedCode && <span>Enhanced code: <strong>{failure.enhancedCode}</strong></span>}
                            {failure.failedAt && <span>Failed at: <strong>{failure.failedAt}</strong></span>}
                        </div>
                        <div className="mt-1 text-sm break-words text-gray-700">{failure.message}</div>
                    </TableCell>
                </TableRow>
            ))}
            {!failures.length && (
                <TableRow>
                    <TableCell className="py-8 text-center text-gray-600">{emptyMessage}</TableCell>
                </TableRow>
            )}
        </TableBody>
    </Table>
);

const CheckOrCross: React.FC<{value: boolean}> = ({value}) => (
    <span aria-label={value ? 'Yes' : 'No'} className={value ? 'font-semibold text-green-600' : 'font-semibold text-red-600'}>
        {value ? '✓' : '✕'}
    </span>
);

const DebugTabs: React.FC<DebugTabsProps> = ({
    permanentFailures,
    temporaryFailures,
    batches,
    emailSettings,
    analyticsStatus,
    customSchedule,
    onToggleCustomSchedule,
    onCustomScheduleChange,
    onScheduleAnalytics,
    onCancelScheduledAnalytics
}) => {
    const erroredBatches = batches.filter(batch => batch.statusClass === 'failed').length;

    return (
        <Tabs defaultValue="permanent-failures" variant="underline">
            <TabsList className="mb-6">
                <TabsTrigger data-testid="debug-tab-permanent-failures" value="permanent-failures">
                    Permanent {pluralize(permanentFailures.length, 'failure', 'failures')}
                    <span className="ml-2 font-semibold">{formatNumber(permanentFailures.length)}</span>
                </TabsTrigger>
                <TabsTrigger data-testid="debug-tab-temporary-failures" value="temporary-failures">
                    Temporary {pluralize(temporaryFailures.length, 'failure', 'failures')}
                    <span className="ml-2 font-semibold">{formatNumber(temporaryFailures.length)}</span>
                </TabsTrigger>
                <TabsTrigger data-testid="debug-tab-batches" value="batches">
                    {pluralize(erroredBatches, 'Batch', 'Batches')} errored
                    <span className="ml-2 font-semibold">{formatNumber(erroredBatches)}</span>
                </TabsTrigger>
                <TabsTrigger data-testid="debug-tab-overview" value="overview">
                    Overview
                </TabsTrigger>
            </TabsList>

            <TabsContent value="permanent-failures">
                <FailuresTable emptyMessage="No permanent failures." failures={permanentFailures} testId="debug-permanent-failures" />
            </TabsContent>

            <TabsContent value="temporary-failures">
                <FailuresTable emptyMessage="No temporary failures." failures={temporaryFailures} testId="debug-temporary-failures" />
            </TabsContent>

            <TabsContent value="batches">
                <Table data-testid="debug-batches">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Segment</TableHead>
                            <TableHead>Recipients</TableHead>
                            <TableHead>Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {batches.map(batch => (
                            <TableRow key={batch.id} data-testid="debug-batches-row">
                                <TableCell className={batch.statusClass === 'failed' ? 'font-semibold text-red-600' : ''}>{batch.status}</TableCell>
                                <TableCell>{batch.createdAt}</TableCell>
                                <TableCell>{batch.segment || 'N/A'}</TableCell>
                                <TableCell>{formatNumber(batch.recipientCount)}</TableCell>
                                <TableCell>
                                    {(batch.providerId || batch.errorStatusCode || batch.errorMessage) ? (
                                        <div className="space-y-1 text-sm">
                                            {batch.providerId && <div>Provider id: <code>{batch.providerId}</code></div>}
                                            {batch.errorStatusCode && <div>Failure status code: <strong>{batch.errorStatusCode}</strong></div>}
                                            {batch.errorMessage && <div className="break-words text-red-600">{batch.errorMessage}</div>}
                                        </div>
                                    ) : 'N/A'}
                                </TableCell>
                            </TableRow>
                        ))}
                        {!batches.length && (
                            <TableRow>
                                <TableCell className="py-8 text-center text-gray-600" colSpan={5}>No batch data.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TabsContent>

            <TabsContent value="overview">
                <div className="max-w-xl" data-testid="debug-overview">
                    <table className="w-full text-sm [&_td]:py-1.5">
                        <tbody>
                            <tr><td>Status:</td><td className={emailSettings.statusClass === 'failed' ? 'font-semibold text-red-600' : ''}>{emailSettings.status}</td></tr>
                            <tr><td>Recipient filter:</td><td>{emailSettings.recipientFilter}</td></tr>
                            <tr><td>Created at:</td><td>{emailSettings.createdAt}</td></tr>
                            <tr><td>Submitted at:</td><td>{emailSettings.submittedAt}</td></tr>
                            <tr><td colSpan={2}><hr className="my-2" /></td></tr>
                            <tr><td>Emails sent:</td><td>{formatNumber(emailSettings.emailsSent)}</td></tr>
                            <tr><td>Delivered:</td><td>{formatNumber(emailSettings.emailsDelivered)}</td></tr>
                            <tr><td>Opened:</td><td>{formatNumber(emailSettings.emailsOpened)}</td></tr>
                            <tr><td>Failed:</td><td>{formatNumber(emailSettings.emailsFailed)}</td></tr>
                            <tr><td colSpan={2}><hr className="my-2" /></td></tr>
                            <tr><td>Track opens:</td><td><CheckOrCross value={emailSettings.trackOpens} /></td></tr>
                            <tr><td>Track clicks:</td><td><CheckOrCross value={emailSettings.trackClicks} /></td></tr>
                            <tr><td>Member feedback:</td><td><CheckOrCross value={emailSettings.feedbackEnabled} /></td></tr>
                            <tr><td colSpan={2}><hr className="my-2" /></td></tr>
                            <tr><td>Analytics Latest running:</td><td><CheckOrCross value={Boolean(analyticsStatus?.latest.running)} /></td></tr>
                            <tr><td>Last started:</td><td>{analyticsStatus?.latest.lastStarted ?? 'N/A'}</td></tr>
                            <tr><td>Fetching from:</td><td>{analyticsStatus?.latest.lastBegin ?? 'N/A'}</td></tr>
                            <tr><td>Last event time:</td><td>{analyticsStatus?.latest.lastEventTimestamp ?? 'N/A'}</td></tr>
                            <tr><td colSpan={2}><hr className="my-2" /></td></tr>
                            <tr><td>Analytics Missing running:</td><td><CheckOrCross value={Boolean(analyticsStatus?.missing.running)} /></td></tr>
                            <tr><td>Last started:</td><td>{analyticsStatus?.missing.lastStarted ?? 'N/A'}</td></tr>
                            <tr><td>Fetching from:</td><td>{analyticsStatus?.missing.lastBegin ?? 'N/A'}</td></tr>
                            <tr><td>Last event time:</td><td>{analyticsStatus?.missing.lastEventTimestamp ?? 'N/A'}</td></tr>
                            <tr><td colSpan={2}><hr className="my-2" /></td></tr>
                            {analyticsStatus?.scheduled.schedule ? (
                                <>
                                    <tr><td>Analytics Scheduled running:</td><td><CheckOrCross value={analyticsStatus.scheduled.running} /></td></tr>
                                    <tr><td>Schedule:</td><td>{analyticsStatus.scheduled.schedule.begin} - {analyticsStatus.scheduled.schedule.end}</td></tr>
                                    <tr><td>Last started:</td><td>{analyticsStatus.scheduled.lastStarted}</td></tr>
                                    <tr><td>Last event time:</td><td>{analyticsStatus.scheduled.lastEventTimestamp}</td></tr>
                                    {!analyticsStatus.scheduled.canceled && (
                                        <tr>
                                            <td colSpan={2}>
                                                <Button variant="outline" onClick={onCancelScheduledAnalytics}>Cancel scheduled refetch</Button>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ) : (
                                customSchedule.show ? (
                                    <>
                                        <tr>
                                            <td><label htmlFor="custom-begin-date">Begin:</label></td>
                                            <td><Input id="custom-begin-date" type="datetime-local" value={customSchedule.begin} onChange={event => onCustomScheduleChange({begin: event.target.value})} /></td>
                                        </tr>
                                        <tr>
                                            <td><label htmlFor="custom-end-date">End:</label></td>
                                            <td><Input id="custom-end-date" type="datetime-local" value={customSchedule.end} onChange={event => onCustomScheduleChange({end: event.target.value})} /></td>
                                        </tr>
                                        <tr>
                                            <td className="space-x-2" colSpan={2}>
                                                <Button variant="outline" onClick={onScheduleAnalytics}>Schedule Custom Refetch</Button>
                                                <Button variant="outline" onClick={onToggleCustomSchedule}>Cancel</Button>
                                            </td>
                                        </tr>
                                    </>
                                ) : (
                                    <tr>
                                        <td className="space-x-2" colSpan={2}>
                                            <Button variant="outline" onClick={onScheduleAnalytics}>Refetch Analytics</Button>
                                            <Button variant="outline" onClick={onToggleCustomSchedule}>Custom Date Range</Button>
                                        </td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </TabsContent>
        </Tabs>
    );
};

export default DebugTabs;
