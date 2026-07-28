import React from 'react';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@tryghost/shade/components';
import {Inline, Stack} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useVersionLink} from './use-version-link';

// The "New automation" template picker, shared by every proto concept's list
// page. Creating an automation is a canvas/editor activity regardless of which
// concept's list you started from, so every template (and "start from
// scratch") hands off to the canvas editor.

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

interface NewAutomationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const NewAutomationDialog: React.FC<NewAutomationDialogProps> = ({open, onOpenChange}) => {
    const navigate = useNavigate();
    const toVersioned = useVersionLink();

    const handleTemplatePick = (templateId: string) => {
        onOpenChange(false);
        // Points at the float concept (the hybrid baseline) now that canvas is
        // gone. NOTE: the create/editor flow itself lived in canvas, so `new`
        // currently lands on float's not-found state — a stub to replace when the
        // hybrid grows a real create flow.
        navigate(toVersioned(`/automations-proto/float/new?template=${templateId}`));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
    );
};
