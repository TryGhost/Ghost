import React, {useState} from 'react';
import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import {AUTOMATION_DESCRIPTIONS, getScenario, mockAutomations} from '@/automations/proto/shared/mock';
import {Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade/components';
import {Box, Container, Inline, Stack} from '@tryghost/shade/primitives';
import {ListPage} from '@tryghost/shade/page-templates';
import {PageHeader} from '@tryghost/shade/patterns';
import {cn, formatNumber, LucideIcon} from '@tryghost/shade/utils';
import {Link, useNavigate} from '@tryghost/admin-x-framework';
import {useVersionLink} from '@/automations/proto/shared/use-version-link';

// Deterministic "now" — matches the anchor used across the surface concept so
// relative dates stay consistent with the detail view.
const NOW_MS = new Date('2026-07-21T09:12:00Z').getTime();

// Shared grid template so the header and every row line up. Mobile collapses to
// name + status; the run/count columns appear from `lg` up.
const gridCols = 'grid grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,1fr)_170px_130px_130px_110px]';

const relRunDate = (iso: string | null): string => {
    if (!iso) {
        return 'Never';
    }
    const mins = Math.round((NOW_MS - new Date(iso).getTime()) / 60_000);
    if (mins < 1) {
        return 'Just now';
    }
    if (mins < 60) {
        return `${mins} minute${mins === 1 ? '' : 's'} ago`;
    }
    const hours = Math.round(mins / 60);
    if (hours < 24) {
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
};

type AutomationTemplate = {
    id: string;
    icon: React.ElementType;
    title: string;
    description: string;
};

const templates: AutomationTemplate[] = [
    {id: 'welcome-email', icon: LucideIcon.Mail, title: 'Welcome email sequence', description: 'A multi-step onboarding sequence that greets new members over their first week.'},
    {id: 'inactive-winback', icon: LucideIcon.Undo2, title: 'Inactive win-back', description: 'Reach out to members who haven’t opened an email in 60 days.'},
    {id: 'upgrade-nudge', icon: LucideIcon.Sparkles, title: 'Paid upgrade nudge', description: 'Encourage engaged free members to upgrade after a defined activity threshold.'},
    {id: 'unsubscribe', icon: LucideIcon.LogOut, title: 'Unsubscribe follow-up', description: 'Ask for feedback and offer alternatives when someone unsubscribes.'},
    {id: 'cancellation', icon: LucideIcon.MessageCircle, title: 'Cancellation survey', description: 'Collect cancellation reasons and surface offers that may retain the member.'}
];

const StatusBadge: React.FC<{status: AutomationDetail['status']}> = ({status}) => (
    status === 'active'
        ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green/20 px-2 py-0.5 text-xs font-medium text-green uppercase">
                <span className="size-1.5 rounded-full bg-green" />
                Live
            </span>
        )
        : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground uppercase">
                Off
            </span>
        )
);

const MetricCell: React.FC<{value: number}> = ({value}) => (
    <TableCell className={cn('hidden lg:block lg:p-4', value === 0 && 'text-muted-foreground')}>
        {formatNumber(value)}
    </TableCell>
);

const AutomationRow: React.FC<{automation: AutomationDetail}> = ({automation}) => {
    const toVersioned = useVersionLink();
    const description = AUTOMATION_DESCRIPTIONS[automation.slug];
    const {metrics} = getScenario(automation.id) ?? {metrics: undefined};

    return (
        <TableRow
            className={cn('relative w-full cursor-pointer items-center gap-x-4 p-2 hover:bg-table-row-hover lg:p-0', gridCols)}
            data-testid="automation-list-row"
        >
            <TableCell className="static min-w-0 lg:p-4">
                <Link
                    className="before:absolute before:inset-0 before:z-10 before:rounded-sm focus-visible:outline-hidden focus-visible:before:ring-2 focus-visible:before:ring-focus-ring"
                    to={toVersioned(`/automations-proto/surface/${automation.id}`)}
                >
                    <span className="block text-md font-semibold">{automation.name}</span>
                </Link>
                {description && <span className="block text-muted-foreground">{description}</span>}
            </TableCell>
            <TableCell className={cn('hidden lg:block lg:p-4', !metrics?.last_enrolled_at && 'text-muted-foreground')}>
                {relRunDate(metrics?.last_enrolled_at ?? null)}
            </TableCell>
            <MetricCell value={metrics?.in_progress ?? 0} />
            <MetricCell value={metrics?.completed ?? 0} />
            <TableCell className="lg:p-4">
                <StatusBadge status={automation.status} />
            </TableCell>
        </TableRow>
    );
};

const AutomationsList: React.FC = () => {
    const navigate = useNavigate();
    const toVersioned = useVersionLink();
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

    // Creating an automation is a canvas/editor activity, so New hands off to the
    // canvas concept's editor rather than the surface (analytics) view.
    const handleTemplatePick = (templateId: string) => {
        setTemplateDialogOpen(false);
        navigate(toVersioned(`/automations-proto/canvas/new?template=${templateId}`));
    };

    return (
        <Box className="size-full">
            <Container className="relative flex h-full flex-col" size="page">
                <ListPage data-testid="automations-proto-surface">
                    <ListPage.Header>
                        <PageHeader blurredBackground={false} sticky={false}>
                            <PageHeader.Left>
                                <PageHeader.Title>Automations</PageHeader.Title>
                            </PageHeader.Left>
                            <PageHeader.Actions>
                                <PageHeader.ActionGroup>
                                    <Button onClick={() => setTemplateDialogOpen(true)}>
                                        New automation
                                    </Button>
                                </PageHeader.ActionGroup>
                            </PageHeader.Actions>
                        </PageHeader>
                    </ListPage.Header>
                    <ListPage.Body>
                        <Table className="flex flex-col" data-testid="automations-list">
                            <TableHeader className="hidden lg:flex lg:flex-col">
                                <TableRow className={cn('w-full items-center gap-x-4 border-b hover:bg-transparent', gridCols)}>
                                    <TableHead className="lg:px-4">Name</TableHead>
                                    <TableHead className="lg:px-4">Last run date</TableHead>
                                    <TableHead className="lg:px-4">In progress</TableHead>
                                    <TableHead className="lg:px-4">Completed</TableHead>
                                    <TableHead className="lg:px-4">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="flex flex-col">
                                {mockAutomations.map(automation => (
                                    <AutomationRow key={automation.id} automation={automation} />
                                ))}
                            </TableBody>
                        </Table>
                    </ListPage.Body>
                </ListPage>
            </Container>

            <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Create a new automation</DialogTitle>
                        <DialogDescription>Start from a template or build your own from scratch.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {templates.map(({id, icon: Icon, title, description}) => (
                            <button
                                key={id}
                                className="rounded-lg border border-border-default p-4 text-left transition-colors hover:bg-interactive-hover"
                                type="button"
                                onClick={() => handleTemplatePick(id)}
                            >
                                <Inline align="start" gap="md">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                        <Icon className="size-5" />
                                    </span>
                                    <Stack gap="none">
                                        <span className="text-sm font-semibold">{title}</span>
                                        <span className="text-xs text-muted-foreground">{description}</span>
                                    </Stack>
                                </Inline>
                            </button>
                        ))}
                        <button
                            className="rounded-lg border border-dashed border-border-default p-4 text-left transition-colors hover:border-solid hover:bg-interactive-hover"
                            type="button"
                            onClick={() => handleTemplatePick('scratch')}
                        >
                            <Inline align="center" gap="md">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
                                    <LucideIcon.FilePlus className="size-5" />
                                </span>
                                <Stack gap="none">
                                    <span className="text-sm font-semibold">Start from scratch</span>
                                    <span className="text-xs text-muted-foreground">An empty canvas with just a trigger.</span>
                                </Stack>
                            </Inline>
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default AutomationsList;
export const Component = AutomationsList;
