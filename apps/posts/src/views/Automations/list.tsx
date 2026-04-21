import MainLayout from '@components/layout/main-layout';
import React from 'react';
import {Automation, AutomationStatus, mockAutomations} from './mock-data';
import {Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade/components';
import {Header} from '@tryghost/shade/primitives';
import {Link, useNavigate} from '@tryghost/admin-x-framework';
import {LucideIcon} from '@tryghost/shade/utils';

function statusVariant(status: AutomationStatus): 'default' | 'secondary' | 'outline' {
    if (status === 'active') {
        return 'default';
    }
    if (status === 'paused') {
        return 'secondary';
    }
    return 'outline';
}

function formatUpdated(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});
}

const AutomationRow: React.FC<{automation: Automation}> = ({automation}) => {
    const navigate = useNavigate();

    return (
        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/automations/${automation.id}`)}>
            <TableCell className="p-4">
                <div className="font-medium">{automation.name}</div>
                <div className="text-muted-foreground">{automation.description}</div>
            </TableCell>
            <TableCell className="p-4">
                <Badge
                    className={`capitalize ${automation.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}`}
                    variant={statusVariant(automation.status)}
                >
                    {automation.status}
                </Badge>
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
                <Header.Actions>
                    <Header.ActionGroup>
                        <Button asChild>
                            <Link className="font-bold" to="/automations/new">
                                <LucideIcon.Plus />
                                New automation
                            </Link>
                        </Button>
                    </Header.ActionGroup>
                </Header.Actions>
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
