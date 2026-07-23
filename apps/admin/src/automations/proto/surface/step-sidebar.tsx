import React, {useState} from 'react';
import type {AutomationAction} from '@tryghost/admin-x-framework/api/automations';
import {Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {Stack} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {EmailPerformance} from './email-analytics';

interface StepSidebarProps {
    action: AutomationAction;
    onSubjectChange: (subject: string) => void;
    onWaitChange: (hours: number) => void;
    onDelete: () => void;
    onClose: () => void;
}

// Split wait_hours into a whole-day count when it divides evenly, else hours.
const splitWait = (hours: number): {amount: number; unit: 'days' | 'hours'} => (
    hours % 24 === 0 ? {amount: hours / 24, unit: 'days'} : {amount: hours, unit: 'hours'}
);

export const StepSidebar: React.FC<StepSidebarProps> = ({action, onSubjectChange, onWaitChange, onDelete, onClose}) => {
    const [emailInfoOpen, setEmailInfoOpen] = useState(false);
    const isEmail = action.type === 'send_email';

    const wait = action.type === 'wait' ? splitWait(action.data.wait_hours) : {amount: 1, unit: 'days' as const};
    const applyWait = (amount: number, unit: 'days' | 'hours') => {
        const hours = unit === 'days' ? amount * 24 : amount;
        if (Number.isSafeInteger(hours) && hours > 0) {
            onWaitChange(hours);
        }
    };

    return (
        <aside className="flex w-96 shrink-0 flex-col border-l border-border-default bg-surface-elevated">
            <div className="flex items-center justify-between border-b border-border-default p-4">
                <div className="flex items-center gap-2">
                    {isEmail ? <LucideIcon.Mail className="size-4 text-muted-foreground" /> : <LucideIcon.Clock className="size-4 text-muted-foreground" />}
                    <span className="font-medium">{isEmail ? 'Send email' : 'Wait'}</span>
                </div>
                <Button aria-label="Close" size="icon" variant="ghost" onClick={onClose}>
                    <LucideIcon.X strokeWidth={2} />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {isEmail ? (
                    <Stack gap="lg">
                        <Stack gap="sm">
                            <Label>Subject line</Label>
                            <Input placeholder="Subject line" value={action.data.email_subject} onChange={e => onSubjectChange(e.target.value)} />
                        </Stack>
                        <Button className="w-full" variant="outline" onClick={() => setEmailInfoOpen(true)}>
                            <LucideIcon.Pencil /> Edit email content
                        </Button>
                        {action.stats && <EmailPerformance stats={action.stats} />}
                    </Stack>
                ) : (
                    <Stack gap="sm">
                        <Label>Wait for</Label>
                        <div className="flex gap-2">
                            <Input
                                className="w-24"
                                min={1}
                                type="number"
                                value={wait.amount}
                                onChange={e => applyWait(Math.max(1, Number(e.target.value) || 1), wait.unit)}
                            />
                            <Select value={wait.unit} onValueChange={value => applyWait(wait.amount, value as 'days' | 'hours')}>
                                <SelectTrigger className="flex-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hours">Hours</SelectItem>
                                    <SelectItem value="days">Days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </Stack>
                )}
            </div>

            <div className="border-t border-border-default p-4">
                <Button className="w-full text-destructive hover:text-destructive" variant="outline" onClick={onDelete}>
                    <LucideIcon.Trash2 /> Delete step
                </Button>
            </div>

            {/* Email content editing is out of scope for the prototype. */}
            <Dialog open={emailInfoOpen} onOpenChange={setEmailInfoOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Email content</DialogTitle>
                        <DialogDescription>
                            The full email editor isn’t wired up in this prototype — this is where the Koenig content editor would open to design the email.
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </aside>
    );
};

export default StepSidebar;
