import React, {useState} from 'react';
import {type Automation, type AutomationStatus, mockAutomations} from '@/automations/proto/shared/mock-data';
import {NewAutomationDialog} from '@/automations/proto/shared/new-automation-dialog';
import {Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade/components';
import {Box, Container} from '@tryghost/shade/primitives';
import {ListPage} from '@tryghost/shade/page-templates';
import {PageHeader} from '@tryghost/shade/patterns';
import {cn, LucideIcon} from '@tryghost/shade/utils';
import {Link} from '@tryghost/admin-x-framework';
import {useVersionLink} from '@/automations/proto/shared/use-version-link';

// NOTE: canvas still runs on its own legacy mock module (shared/mock-data),
// not the shared proto/shared/mock the other two concepts use — its editor
// (canvas/editor.tsx) depends on the same module, so unifying the data model
// is a bigger migration than this list-page tightening pass. The status pill
// below is canvas-local because that legacy AutomationStatus is a 3-state
// union ('active' | 'paused' | 'draft'), unlike the real 2-state
// AutomationStatus ('active' | 'inactive') the shared StatusBadge renders.

const gridCols = 'grid grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,1fr)_130px_160px]';

const statusPillStyles: Record<AutomationStatus, string> = {
    active: 'bg-green/20 text-green',
    paused: 'bg-muted text-muted-foreground',
    draft: 'bg-blue/15 text-blue'
};

const StatusPill: React.FC<{status: AutomationStatus}> = ({status}) => (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium uppercase', statusPillStyles[status])}>
        {status === 'active' && <span className="size-1.5 rounded-full bg-green" />}
        {status}
    </span>
);

const formatUpdated = (iso: string): string => new Date(iso).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});

const AutomationRow: React.FC<{automation: Automation}> = ({automation}) => {
    const toVersioned = useVersionLink();

    return (
        <TableRow
            className={cn('relative w-full cursor-pointer items-center gap-x-4 p-2 hover:bg-table-row-hover lg:p-0', gridCols)}
            data-testid="automation-list-row"
        >
            <TableCell className="static min-w-0 lg:p-4">
                <Link
                    className="before:absolute before:inset-0 before:z-10 before:rounded-sm focus-visible:outline-hidden focus-visible:before:ring-2 focus-visible:before:ring-focus-ring"
                    to={toVersioned(`/automations-proto/canvas/${automation.id}`)}
                >
                    <span className="block text-md font-semibold">{automation.name}</span>
                </Link>
                <span className="block text-muted-foreground">{automation.description}</span>
            </TableCell>
            <TableCell className="hidden lg:block lg:p-4">
                <StatusPill status={automation.status} />
            </TableCell>
            <TableCell className="hidden text-muted-foreground lg:block lg:p-4">
                {formatUpdated(automation.updatedAt)}
            </TableCell>
        </TableRow>
    );
};

const AutomationsList: React.FC = () => {
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

    return (
        <Box className="size-full">
            <Container className="relative flex h-full flex-col" size="page">
                <ListPage data-testid="automations-proto-canvas">
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
                        <Table className="flex flex-col" data-testid="automations-list">
                            <TableHeader className="hidden lg:flex lg:flex-col">
                                <TableRow className={cn('w-full items-center gap-x-4 border-b hover:bg-transparent', gridCols)}>
                                    <TableHead className="lg:px-4">Name</TableHead>
                                    <TableHead className="lg:px-4">Status</TableHead>
                                    <TableHead className="lg:px-4">Last updated</TableHead>
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

            <NewAutomationDialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen} />
        </Box>
    );
};

export default AutomationsList;
export const Component = AutomationsList;
