import MainLayout from '@components/layout/main-layout';
import React from 'react';
import {Automation, AutomationStatus, mockAutomations} from './mock-data';
import {Header} from '@tryghost/shade/primitives';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade/components';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useVersionLink} from '../../use-version-link';

const StatusPill: React.FC<{status: AutomationStatus}> = ({status}) => {
    if (status === 'live') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                <span className="size-1.5 rounded-full bg-green-500" />
                LIVE
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-grey-100 px-2 py-0.5 text-xs font-medium text-grey-700">
            OFF
        </span>
    );
};

function formatUpdated(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});
}

const AutomationRow: React.FC<{automation: Automation}> = ({automation}) => {
    const navigate = useNavigate();
    const toVersioned = useVersionLink();

    return (
        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(toVersioned(`/automations/${automation.id}`))}>
            <TableCell className="p-4">
                <div className="font-medium">{automation.name}</div>
                <div className="text-muted-foreground">{automation.description}</div>
            </TableCell>
            <TableCell className="p-4">
                <StatusPill status={automation.status} />
            </TableCell>
            <TableCell className="p-4 text-muted-foreground">
                {formatUpdated(automation.updatedAt)}
            </TableCell>
        </TableRow>
    );
};

const AutomationsList: React.FC = () => {
    return (
        <MainLayout>
            <Header>
                <Header.Title>Automations</Header.Title>
            </Header>
            <section className="flex size-full grow flex-col gap-6 p-4 lg:p-8">
                <Table data-testid="automations-list">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-auto px-4">Automation</TableHead>
                            <TableHead className="w-32 px-4">Status</TableHead>
                            <TableHead className="w-40 px-4">Last updated</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mockAutomations.map(automation => (
                            <AutomationRow key={automation.id} automation={automation} />
                        ))}
                    </TableBody>
                </Table>
            </section>
        </MainLayout>
    );
};

export default AutomationsList;
export const Component = AutomationsList;
