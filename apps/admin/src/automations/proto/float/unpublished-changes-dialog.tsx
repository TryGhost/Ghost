import React, {useState} from 'react';
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@tryghost/shade/components';
import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import type {ChangeEntry} from './change-summary';
import {stepKindIcon} from '@/automations/proto/canvas/flow-utils';

// The unpublished-changes state for the 'banner' header variant (see
// header-model.ts), as a control beside the header's Publish rather than
// anything on the canvas.
//
// The earlier attempts each failed in their own way: a button labelled
// "Unpublished changes" announced a status where an action belongs, and a banner
// floating on the canvas took space from the thing being edited to say one
// sentence. This keeps the state in the header — where the actions that resolve
// it already are — and puts everything it has to say behind one click.
//
// The button is an action: it opens the review. The warning icon carries the
// state, which is what an icon is for; the button itself still names something
// you do.
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
            {/* Borderless: it sits beside a primary and an outline button, and a
                third bordered control in that row made the cluster read as three
                equal choices rather than one action with a note next to it.

                The count is the point of putting a number here at all — "something
                changed" is what the icon already says, while "4" is the first thing
                that tells you whether this is a typo fix or a rewrite. Icon alone
                when the diff can't be enumerated, rather than a misleading 0. */}
            <Button
                aria-label={count === 1 ? 'Review 1 unpublished change' : 'Review unpublished changes'}
                type="button"
                variant="ghost"
                onClick={() => setOpen(true)}
            >
                {/* Not text-state-warning: that token is yellow-500, which goes faint
                    against a light header. Matched to the sibling popover's icon
                    instead — one stop darker in light, plain yellow in dark. A dark:
                    variant only because no semantic token sits between state-warning
                    and its black foreground. */}
                <LucideIcon.TriangleAlert className="text-yellow-600 dark:text-yellow" strokeWidth={2} />
                {count > 0 && formatNumber(count)}
            </Button>
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
