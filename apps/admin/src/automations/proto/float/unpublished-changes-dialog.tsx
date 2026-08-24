import React, {useState} from 'react';
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@tryghost/shade/components';
import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import type {ChangeEntry} from './change-summary';
import {stepKindIcon} from '@/automations/proto/canvas/flow-utils';

// The unpublished-changes state for the future release, as the header's own
// primary action rather than anything on the canvas.
//
// Every earlier attempt failed the same way: each put a *reporter* of the state
// next to the *resolver* of it — a button labelled "Unpublished changes", a
// banner floating on the canvas, then a warning icon carrying a change count
// beside a Publish button. Two controls for one situation, and the reporting one
// always read as an action you hadn't taken yet.
//
// So there is one control now, and it names the only thing you'd sensibly do
// first: Review changes. Publishing is a decision, and this is the screen that
// lets you make it — what's in the draft, what members are seeing meanwhile, and
// then publish or discard. The state doesn't need announcing beside the button,
// because the button only exists while the state does.
//
// The dialog answers the question the state actually raises — "is what I'm
// looking at what members are getting?" — before listing the diff, because
// knowing the changes aren't live yet is what makes the list worth reading.

export const UnpublishedChangesDialog: React.FC<{
    changes: ChangeEntry[];
    onDiscard: () => void;
    onPublish: () => void;
}> = ({changes, onDiscard, onPublish}) => {
    const [open, setOpen] = useState(false);
    const count = changes.length;

    // Both close first: discard would leave the dialog listing changes it just
    // threw away, and publish would leave it describing a draft that's now live.
    const discard = () => {
        setOpen(false);
        onDiscard();
    };
    const publish = () => {
        setOpen(false);
        onPublish();
    };

    return (
        <>
            {/* Primary, and the only draft control in the row — publishing happens
                inside, once you've seen what you'd be publishing. No warning icon
                and no count: both were reporting a state that the button's own
                presence already reports. */}
            <Button type="button" onClick={() => setOpen(true)}>Review changes</Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Unpublished changes</DialogTitle>
                        {/* Written to the house guidelines: active and positive.
                            The earlier version said what members "won't see" and that
                            edits "aren't live yet" — two negatives to describe a state
                            that's perfectly fine, which is exactly what the positive-
                            writing rule is aimed at. Saying the same thing forwards
                            (Ghost saves; members keep following) reassures instead. */}
                        <DialogDescription className="text-foreground">
                            Ghost saves your changes as a draft. Members keep following the published version of this automation until you publish them.
                        </DialogDescription>
                    </DialogHeader>
                    {/* Each entry marked with its step's own icon rather than a
                        bullet: the icons are the same ones the canvas labels its cards
                        with, so a change can be matched to the card it happened on
                        without reading the sentence.

                        Still not one of Shade's list components: ActionList divides and
                        hovers its rows, DataList pairs a label with a value — both
                        would claim these entries are interactive or measurable, and
                        they're neither. They describe a diff. */}
                    <Stack className="max-h-72 overflow-y-auto" gap="sm">
                        {count === 0 ? (
                            // Reachable while an edit is mid-flight, or if something
                            // changed that the summary can't describe. Says what's true
                            // and actionable rather than what the summary failed to do.
                            <Text size="sm">Your draft has changes that are ready to publish.</Text>
                        ) : changes.map((change) => {
                            const Icon = stepKindIcon[change.kind];
                            return (
                                <Inline key={change.id} align="start" className="text-sm" gap="sm">
                                    <Icon className="mt-px size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                                    <span>{change.label}</span>
                                </Inline>
                            );
                        })}
                    </Stack>
                    {/* Discard is the destructive one and sits away from the primary,
                        which is why it leads rather than trails. Its undo lives in the
                        toast it raises, same as everywhere else. */}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={discard}>Discard all changes</Button>
                        <Button type="button" onClick={publish}>Publish changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
