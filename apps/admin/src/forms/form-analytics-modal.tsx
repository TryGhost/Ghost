import React, {useState, useMemo} from 'react';
import {Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, EmptyIndicator, LoadingIndicator, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import {blobDownloadFromEndpoint} from '@tryghost/admin-x-framework/helpers';
import {useBrowseSubmissions, type Form, type FormField, type FormSchema, type FormSubmission} from '@tryghost/admin-x-framework/api/forms';

interface FormAnalyticsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    form: Form;
}

export const FormAnalyticsModal: React.FC<FormAnalyticsModalProps> = ({
    open,
    onOpenChange,
    form
}) => {
    const {data, isLoading, isError} = useBrowseSubmissions(form.id, {
        enabled: open
    });

    const [isExporting, setIsExporting] = useState(false);

    let parsedSchema: FormSchema = {fields: []};
    if (typeof form.schema === 'string') {
        try {
            parsedSchema = JSON.parse(form.schema) as FormSchema;
        } catch {
            parsedSchema = {fields: []};
        }
    } else if (form.schema && Array.isArray(form.schema.fields)) {
        parsedSchema = form.schema;
    }

    const fields = parsedSchema.fields || [];
    const submissions = useMemo(() => data?.form_submissions || [], [data]);

    // Analytics calculations
    const analytics = useMemo(() => {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        let todayCount = 0;
        let weekCount = 0;
        let monthCount = 0;

        // Daily counts for past 14 days
        const daysMap: Record<string, number> = {};
        for (let i = 13; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const key = d.toISOString().slice(0, 10);
            daysMap[key] = 0;
        }

        // Field value counts for breakdown
        const fieldCounts: Record<string, {total: number; values: Record<string, number>}> = {};
        fields.forEach((f) => {
            fieldCounts[f.id] = {total: 0, values: {}};
        });

        submissions.forEach((sub) => {
            const subDate = sub.created_at ? new Date(sub.created_at) : null;
            if (subDate) {
                if (subDate >= oneDayAgo) {
                    todayCount += 1;
                }
                if (subDate >= sevenDaysAgo) {
                    weekCount += 1;
                }
                if (subDate >= thirtyDaysAgo) {
                    monthCount += 1;
                }

                const dayKey = subDate.toISOString().slice(0, 10);
                if (daysMap[dayKey] !== undefined) {
                    daysMap[dayKey] += 1;
                }
            }

            // Parse sub data
            let subData: Record<string, unknown> = {};
            if (typeof sub.data === 'string') {
                try {
                    subData = JSON.parse(sub.data) as Record<string, unknown>;
                } catch {
                    subData = {};
                }
            } else if (sub.data) {
                subData = sub.data;
            }

            fields.forEach((f) => {
                const val = subData[f.id] !== undefined ? subData[f.id] : subData[f.name];
                if (val !== undefined && val !== null && val !== '') {
                    fieldCounts[f.id].total += 1;
                    const strVal = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : (typeof val === 'object' && val !== null ? JSON.stringify(val) : (typeof val === 'string' || typeof val === 'number' ? String(val) : ''));
                    fieldCounts[f.id].values[strVal] = (fieldCounts[f.id].values[strVal] || 0) + 1;
                }
            });
        });

        const timelineDays = Object.entries(daysMap).map(([date, count]) => ({
            date,
            label: new Date(date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}),
            count
        }));

        const maxDailyCount = Math.max(...timelineDays.map(d => d.count), 1);

        return {
            total: submissions.length,
            todayCount,
            weekCount,
            monthCount,
            timelineDays,
            maxDailyCount,
            fieldCounts
        };
    }, [submissions, fields]);

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const filename = `${form.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
            await blobDownloadFromEndpoint(`/forms/${form.id}/submissions/export`, filename);
        } catch {
            // Client-side fallback if endpoint fails
            const headers = ['Submission ID', 'Submitted At', ...fields.map(f => f.label || f.name || f.id)];
            const rows = submissions.map((sub) => {
                let subData: Record<string, unknown> = {};
                if (typeof sub.data === 'string') {
                    try {
                        subData = JSON.parse(sub.data) as Record<string, unknown>;
                    } catch {
                        subData = {};
                    }
                } else if (sub.data) {
                    subData = sub.data;
                }

                const row = [
                    sub.id,
                    sub.created_at ? new Date(sub.created_at).toISOString() : ''
                ];

                fields.forEach((f) => {
                    const raw = subData[f.id] !== undefined ? subData[f.id] : subData[f.name];
                    const strRaw = typeof raw === 'object' && raw !== null ? JSON.stringify(raw) : (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean' ? String(raw) : '');
                    row.push(raw !== undefined && raw !== null ? `"${strRaw.replace(/"/g, '""')}"` : '""');
                });
                return row.join(',');
            });

            const csvContent = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${form.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-responses.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden p-0">
                <DialogHeader className="border-b border-border-default p-6 pb-4">
                    <Inline align="center" className="w-full pr-6" justify="between">
                        <div>
                            <DialogTitle className="flex items-center gap-2">
                                <LucideIcon.BarChart2 className="size-5 text-primary" />
                                <span>Form Analytics: {form.name}</span>
                            </DialogTitle>
                            <DialogDescription>
                                Real-time response metrics, submission velocity, and field distribution insights.
                            </DialogDescription>
                        </div>
                        {submissions.length > 0 && (
                            <Button disabled={isExporting} size="sm" variant="outline" onClick={() => { void handleExport(); }}>
                                <LucideIcon.Download className="mr-1.5 size-3.5" />
                                {isExporting ? 'Exporting...' : 'Export Responses (CSV)'}
                            </Button>
                        )}
                    </Inline>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex h-72 items-center justify-center">
                            <LoadingIndicator size="lg" />
                        </div>
                    ) : isError ? (
                        <div className="flex h-72 flex-col items-center justify-center">
                            <Text className="text-destructive">Failed to load analytics data.</Text>
                        </div>
                    ) : submissions.length === 0 ? (
                        <div className="flex h-72 items-center justify-center">
                            <EmptyIndicator
                                description="No submissions have been recorded yet. Share or embed this form to start collecting responses."
                                title="No response data yet"
                            />
                        </div>
                    ) : (
                        <Stack gap="lg">
                            {/* Summary KPI Cards */}
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                <Card className="bg-surface-elevated-1 border border-border-default">
                                    <CardContent className="p-4">
                                        <Text size="xs" tone="secondary">Total Responses</Text>
                                        <div className="mt-1 text-2xl font-bold tracking-tight">
                                            {formatNumber(analytics.total)}
                                        </div>
                                        <Text className="mt-1 text-[11px] text-muted-foreground">All-time submissions</Text>
                                    </CardContent>
                                </Card>

                                <Card className="bg-surface-elevated-1 border border-border-default">
                                    <CardContent className="p-4">
                                        <Text size="xs" tone="secondary">Today</Text>
                                        <div className="mt-1 text-2xl font-bold tracking-tight text-primary">
                                            {formatNumber(analytics.todayCount)}
                                        </div>
                                        <Text className="mt-1 text-[11px] text-muted-foreground">Last 24 hours</Text>
                                    </CardContent>
                                </Card>

                                <Card className="bg-surface-elevated-1 border border-border-default">
                                    <CardContent className="p-4">
                                        <Text size="xs" tone="secondary">This Week</Text>
                                        <div className="mt-1 text-2xl font-bold tracking-tight">
                                            {formatNumber(analytics.weekCount)}
                                        </div>
                                        <Text className="mt-1 text-[11px] text-muted-foreground">Past 7 days</Text>
                                    </CardContent>
                                </Card>

                                <Card className="bg-surface-elevated-1 border border-border-default">
                                    <CardContent className="p-4">
                                        <Text size="xs" tone="secondary">This Month</Text>
                                        <div className="mt-1 text-2xl font-bold tracking-tight">
                                            {formatNumber(analytics.monthCount)}
                                        </div>
                                        <Text className="mt-1 text-[11px] text-muted-foreground">Past 30 days</Text>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* 14-Day Activity Bar Chart */}
                            <Card className="border border-border-default">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-semibold">Submissions Velocity (Past 14 Days)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex h-36 items-end gap-2 pt-4">
                                        {analytics.timelineDays.map((day) => {
                                            const heightPct = Math.max(Math.round((day.count / analytics.maxDailyCount) * 100), 4);
                                            return (
                                                <div key={day.date} className="group relative flex flex-1 flex-col items-center">
                                                    {/* Tooltip on hover */}
                                                    <div className="pointer-events-none absolute -top-8 z-10 hidden rounded bg-popover px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap shadow group-hover:block">
                                                        {day.label}: {day.count}
                                                    </div>
                                                    <div
                                                        className={`w-full rounded-t transition-all ${day.count > 0 ? 'bg-primary hover:bg-primary/80' : 'bg-surface-elevated-2'}`}
                                                        style={{height: `${heightPct}%`}}
                                                    />
                                                    <span className="mt-1.5 block w-full truncate text-center text-[9px] text-muted-foreground">
                                                        {day.label.split(' ')[1] || day.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Response Tabs: Field Breakdown & Recent Stream */}
                            <Tabs className="w-full" defaultValue="breakdown">
                                <TabsList className="mb-4 grid w-full max-w-xs grid-cols-2">
                                    <TabsTrigger value="breakdown">Field Breakdown</TabsTrigger>
                                    <TabsTrigger value="stream">Recent Responses</TabsTrigger>
                                </TabsList>

                                {/* Field Breakdown Tab */}
                                <TabsContent className="space-y-4" value="breakdown">
                                    {fields.map((f: FormField) => {
                                        const stat = analytics.fieldCounts[f.id] || {total: 0, values: {}};
                                        const responseRate = analytics.total > 0 ? Math.round((stat.total / analytics.total) * 100) : 0;
                                        const topValues = Object.entries(stat.values).sort((a, b) => b[1] - a[1]);

                                        return (
                                            <Card key={f.id} className="border border-border-default">
                                                <CardContent className="p-4">
                                                    <Inline align="center" className="mb-3" justify="between">
                                                        <Inline align="center" gap="sm">
                                                            <Badge className="font-mono text-[10px] capitalize" variant="secondary">
                                                                {f.type}
                                                            </Badge>
                                                            <Text size="sm" weight="semibold">{f.label || f.name}</Text>
                                                        </Inline>
                                                        <Text size="xs" tone="secondary">
                                                            Filled in {formatNumber(stat.total)} of {formatNumber(analytics.total)} ({responseRate}%)
                                                        </Text>
                                                    </Inline>

                                                    {topValues.length === 0 ? (
                                                        <Text size="xs" tone="secondary">No values recorded for this field yet.</Text>
                                                    ) : f.type === 'select' || f.type === 'checkbox' ? (
                                                        <div className="space-y-2">
                                                            {topValues.map(([val, cnt]) => {
                                                                const pct = stat.total > 0 ? Math.round((cnt / stat.total) * 100) : 0;
                                                                return (
                                                                    <div key={val} className="space-y-1">
                                                                        <div className="flex justify-between text-xs">
                                                                            <span className="font-medium">{val}</span>
                                                                            <span className="text-muted-foreground">{cnt} ({pct}%)</span>
                                                                        </div>
                                                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated-2">
                                                                            <div
                                                                                className="h-full rounded-full bg-primary transition-all"
                                                                                style={{width: `${pct}%`}}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {topValues.slice(0, 8).map(([val, cnt]) => (
                                                                <Badge key={val} className="text-xs font-normal" variant="outline">
                                                                    <span className="max-w-[200px] truncate">{val}</span>
                                                                    {cnt > 1 && <span className="ml-1 font-mono text-[10px] text-muted-foreground">x{cnt}</span>}
                                                                </Badge>
                                                            ))}
                                                            {topValues.length > 8 && (
                                                                <span className="self-center text-xs text-muted-foreground">
                                                                    +{topValues.length - 8} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </TabsContent>

                                {/* Recent Responses Stream */}
                                <TabsContent className="space-y-3" value="stream">
                                    {submissions.slice(0, 10).map((sub: FormSubmission) => {
                                        let subData: Record<string, unknown> = {};
                                        if (typeof sub.data === 'string') {
                                            try {
                                                subData = JSON.parse(sub.data) as Record<string, unknown>;
                                            } catch {
                                                subData = {};
                                            }
                                        } else if (sub.data) {
                                            subData = sub.data;
                                        }

                                        const timeStr = sub.created_at
                                            ? new Date(sub.created_at).toLocaleString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })
                                            : '—';

                                        return (
                                            <Card key={sub.id} className="bg-surface-elevated-1 border border-border-default p-3">
                                                <Inline align="center" className="mb-2" justify="between">
                                                    <span className="font-mono text-xs text-muted-foreground">{timeStr}</span>
                                                    <Badge className="font-mono text-[10px]" variant="outline">{sub.id.slice(-6)}</Badge>
                                                </Inline>
                                                <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-3">
                                                    {fields.map((f: FormField) => {
                                                        const raw = subData[f.id] !== undefined ? subData[f.id] : subData[f.name];
                                                        const display = raw !== undefined && raw !== null && raw !== '' ? (typeof raw === 'object' ? JSON.stringify(raw) : (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean' ? String(raw) : '—')) : '—';
                                                        return (
                                                            <div key={f.id} className="min-w-0">
                                                                <span className="block truncate text-[11px] text-muted-foreground">{f.label || f.name}:</span>
                                                                <span className="block truncate font-medium text-foreground">{display}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </TabsContent>
                            </Tabs>
                        </Stack>
                    )}
                </div>

                <DialogFooter className="border-t border-border-default p-4">
                    <Inline gap="sm" justify="end">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                    </Inline>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default FormAnalyticsModal;
