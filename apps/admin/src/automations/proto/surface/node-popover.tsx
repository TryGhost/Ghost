import React, {useEffect} from 'react';
import {Button} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {NODE_CARD_SURFACE} from './flow-node-shell';

// A popover that lives in CANVAS space, not viewport space.
//
// The obvious implementation — Radix Popover — portals its content to the body,
// so the card would sit at a fixed screen position while the flow pans and
// zooms out from under it. Rendering it as a child of the node instead means it
// inherits React Flow's transform: it pans and scales with the node it belongs
// to, the way Audienceful's in-canvas config card does.
//
// Two things make that work:
// - the caller wraps its node content in NodeAnchor (position: relative) so this
//   can anchor to the card's bottom edge;
// - the caller raises that node's `zIndex` while open, because a later sibling
//   node would otherwise paint over a card that hangs below its own node.
//
// nodrag/nopan + stopPropagation keep interaction inside the card from panning
// the canvas or re-firing node selection.

export const NodeAnchor: React.FC<{children: React.ReactNode}> = ({children}) => (
    <div className="relative">{children}</div>
);

interface NodePopoverProps {
    open: boolean;
    onClose: () => void;
    // Optional header row. Omitted when the content brings its own heading — the
    // close button then floats in the corner instead.
    title?: string;
    children: React.ReactNode;
}

export const NodePopover: React.FC<NodePopoverProps> = ({open, onClose, title, children}) => {
    useEffect(() => {
        if (!open) {
            return;
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    return (
        <div
            className={`nodrag nopan absolute top-[calc(100%+12px)] left-0 z-50 w-[400px] cursor-default rounded-xl border border-border-default shadow-lg ${NODE_CARD_SURFACE}`}
            onClick={e => e.stopPropagation()}
        >
            {title ? (
                <div className="flex items-center justify-between gap-2 p-5 pb-3">
                    <span className="text-md font-medium">{title}</span>
                    <Button aria-label="Close" size="icon" variant="ghost" onClick={onClose}>
                        <LucideIcon.X strokeWidth={2} />
                    </Button>
                </div>
            ) : (
                <div className="absolute top-3 right-3 z-10">
                    <Button aria-label="Close" size="icon" variant="ghost" onClick={onClose}>
                        <LucideIcon.X strokeWidth={2} />
                    </Button>
                </div>
            )}
            <div className={title ? 'p-5 pt-0' : 'p-5'}>{children}</div>
        </div>
    );
};
