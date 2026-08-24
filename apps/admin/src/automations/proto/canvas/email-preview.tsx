import React from 'react';
import {Button, InputGroup, InputGroupAddon, InputGroupInput, InputGroupText, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@tryghost/shade/components';
import {LucideIcon, cn} from '@tryghost/shade/utils';

// Placeholder email body for the node preview. The real email_lexical is empty in the
// proto's mock data, so this stands in to make the node read as an email.
const EMAIL_BODY_PREVIEW = 'Hey there,\n\nThanks for joining — here’s what to expect next, straight to your inbox.\n\nOver the next few weeks we’ll share our best tips, stories from the community, and the occasional behind-the-scenes look at what we’re building.\n\nGlad to have you here.';

interface EmailPreviewProps {
    subject: string;
    /**
     * Future concept: drop the form chrome. The subject becomes the card's own
     * heading and the body a muted excerpt beneath it, so an email card reads as an
     * email rather than as a two-field form — which is what lets the performance
     * block below it sit at a lower weight without disappearing.
     *
     * Still editable, and with no mode to enter: the subject is a borderless input
     * that looks like text until you focus it. The body can't be edited in place,
     * so it keeps a pencil — revealed on card hover rather than parked on the card
     * permanently, since at rest it's the email you're meant to be reading.
     */
    bare?: boolean;
    // editable (edit canvas): subject is an inline input + the body sheet carries a
    // floating edit-content button. Read (run/read canvas): subject is shown read-only
    // and the body sheet is display-only — same layout, so all states look identical.
    editable?: boolean;
    onSubjectChange?: (subject: string) => void;
    onEditContent?: () => void;
}

// Subject line (with a discreet leading "Subject" label) above an email body excerpt
// sheet. Shared by both canvases so the email node reads the same across edit / read /
// run. Metrics and any run-detail line are appended by the caller.
export const EmailPreview: React.FC<EmailPreviewProps> = ({subject, editable = false, bare = false, onSubjectChange, onEditContent}) => (bare ? (
    <div>
        <div className="flex items-start gap-2">
            <input
                aria-label="Subject line"
                className="min-w-0 flex-1 truncate bg-transparent text-md font-semibold text-foreground outline-none placeholder:text-muted-foreground read-only:cursor-default"
                placeholder="Subject line"
                readOnly={!editable}
                value={subject}
                onChange={editable ? (e => onSubjectChange?.(e.target.value)) : undefined}
            />
            {editable && (
                <Button
                    aria-label="Edit email content"
                    className="-mt-1 shrink-0 opacity-0 transition-opacity group-hover/node:opacity-100 focus-visible:opacity-100"
                    size="icon"
                    variant="ghost"
                    onClick={() => onEditContent?.()}
                >
                    <LucideIcon.SquarePen />
                </Button>
            )}
        </div>
        <p className="mt-1 line-clamp-2 text-control text-muted-foreground">{EMAIL_BODY_PREVIEW}</p>
    </div>
) : (
    <div>
        <InputGroup className="mb-3">
            <InputGroupAddon align="inline-start">
                <InputGroupText>Subject</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
                placeholder="Subject line"
                readOnly={!editable}
                value={subject}
                onChange={editable ? (e => onSubjectChange?.(e.target.value)) : undefined}
            />
        </InputGroup>
        {/* Preview surface matches the subject input's chrome (border, fill, radius);
            body text matches the "Subject" label size/colour. When editable, edit-content
            floats top-right, inset to the sheet's p-4 padding. */}
        <div className="relative rounded-md border border-control-border bg-control-surface p-4">
            <p className={cn('line-clamp-6 text-control whitespace-pre-line text-muted-foreground', editable && 'pr-9')}>{EMAIL_BODY_PREVIEW}</p>
            {editable && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button aria-label="Edit email content" className="absolute top-[8px] right-[8px]" size="icon" variant="ghost" onClick={() => onEditContent?.()}>
                                <LucideIcon.SquarePen />
                            </Button>
                        </TooltipTrigger>
                        {/* This preview sits inside a node card, so the canvas can
                            pan out from under an open tooltip. See the OptionPicker
                            for why floating content needs "always" here. */}
                        <TooltipContent updatePositionStrategy="always">Edit email content</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
    </div>
));
