import MainLayout from '@components/layout/main-layout';
import React, {useState} from 'react';
import {Automation, AutomationStatus, mockAutomations} from './mock-data';
import {Badge, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade/components';
import {Header} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useVersionLink} from '../../use-version-link';

type AutomationTemplate = {
    id: string;
    icon: React.ElementType;
    title: string;
    description: string;
};

const templates: AutomationTemplate[] = [
    {id: 'welcome-email', icon: LucideIcon.Mail, title: 'Welcome email sequence', description: 'A multi-step onboarding sequence that greets new members over their first week.'},
    {id: 'inactive-winback', icon: LucideIcon.Undo2, title: 'Inactive win-back', description: 'Reach out to members who haven\u2019t opened an email in 60 days.'},
    {id: 'upgrade-nudge', icon: LucideIcon.Sparkles, title: 'Paid upgrade nudge', description: 'Encourage engaged free members to upgrade after a defined activity threshold.'},
    {id: 'unsubscribe', icon: LucideIcon.LogOut, title: 'Unsubscribe follow-up', description: 'Ask for feedback and offer alternatives when someone unsubscribes.'},
    {id: 'cancellation', icon: LucideIcon.MessageCircle, title: 'Cancellation survey', description: 'Collect cancellation reasons and surface offers that may retain the member.'}
];

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
    const toVersioned = useVersionLink();

    return (
        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(toVersioned(`/automations/${automation.id}`))}>
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
    const navigate = useNavigate();
    const toVersioned = useVersionLink();
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

    const handleTemplatePick = (templateId: string) => {
        setTemplateDialogOpen(false);
        navigate(toVersioned(`/automations/new?template=${templateId}`));
    };

    return (
        <MainLayout>
            <Header>
                <Header.Title>Automations</Header.Title>
                <Header.Actions>
                    <Header.ActionGroup>
                        <Button className="font-bold" onClick={() => setTemplateDialogOpen(true)}>
                            <LucideIcon.Plus />
                            New automation
                        </Button>
                    </Header.ActionGroup>
                </Header.Actions>
            </Header>
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
                                className="flex items-start gap-3 rounded-lg border border-grey-200 p-4 text-left transition-colors hover:bg-muted"
                                type="button"
                                onClick={() => handleTemplatePick(id)}
                            >
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-grey-100 text-grey-700">
                                    <Icon className="size-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold">{title}</span>
                                    <span className="text-xs text-grey-600">{description}</span>
                                </div>
                            </button>
                        ))}
                        <button
                            className="flex items-center gap-3 rounded-lg border border-dashed border-grey-300 p-4 text-left transition-colors hover:border-solid hover:bg-muted"
                            type="button"
                            onClick={() => handleTemplatePick('scratch')}
                        >
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-background text-grey-700">
                                <LucideIcon.FilePlus className="size-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold">Start from scratch</span>
                                <span className="text-xs text-grey-600">An empty canvas with just a trigger.</span>
                            </div>
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
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
