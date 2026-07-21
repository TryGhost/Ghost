import React, {useState} from 'react';
import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';
import {AUTOMATION_DESCRIPTIONS, mockAutomations} from './mock';
import {Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Table, TableBody, TableCell, TableRow} from '@tryghost/shade/components';
import {Box, Container, Inline, Stack} from '@tryghost/shade/primitives';
import {ListPage} from '@tryghost/shade/page-templates';
import {PageHeader} from '@tryghost/shade/patterns';
import {LucideIcon} from '@tryghost/shade/utils';
import {Link, useNavigate} from '@tryghost/admin-x-framework';
import {useVersionLink} from '@/automations/proto/shared/use-version-link';

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

const AutomationRow: React.FC<{automation: AutomationDetail}> = ({automation}) => {
    const toVersioned = useVersionLink();
    const description = AUTOMATION_DESCRIPTIONS[automation.slug];

    return (
        <TableRow
            className="relative grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 p-2 hover:bg-table-row-hover lg:p-0"
            data-testid="automation-list-row"
        >
            <TableCell className="static min-w-0 lg:p-4">
                <Link
                    className="before:absolute before:inset-0 before:z-10 before:rounded-sm focus-visible:outline-hidden focus-visible:before:ring-2 focus-visible:before:ring-focus-ring"
                    to={toVersioned(`/automations-proto/dashboard/${automation.id}`)}
                >
                    <span className="block text-md font-semibold">{automation.name}</span>
                </Link>
                {description && <span className="block text-muted-foreground">{description}</span>}
            </TableCell>
            <TableCell className="text-right lg:w-32 lg:p-4">
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
    // canvas concept's editor rather than the dashboard (analytics) view.
    const handleTemplatePick = (templateId: string) => {
        setTemplateDialogOpen(false);
        navigate(toVersioned(`/automations-proto/canvas/new?template=${templateId}`));
    };

    return (
        <Box className="size-full">
            <Container className="relative flex h-full flex-col" size="page">
                <ListPage data-testid="automations-proto-dashboard">
                    <ListPage.Header>
                        <PageHeader blurredBackground={false} sticky={false}>
                            <PageHeader.Left>
                                <PageHeader.Title>Automations</PageHeader.Title>
                            </PageHeader.Left>
                            <PageHeader.Actions>
                                <PageHeader.ActionGroup>
                                    <Button onClick={() => setTemplateDialogOpen(true)}>
                                        <LucideIcon.Plus />
                                        New automation
                                    </Button>
                                </PageHeader.ActionGroup>
                            </PageHeader.Actions>
                        </PageHeader>
                    </ListPage.Header>
                    <ListPage.Body>
                        <Table className="flex flex-col border-t" data-testid="automations-list">
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
