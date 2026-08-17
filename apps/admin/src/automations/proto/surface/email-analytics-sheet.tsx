import React, {useEffect, useRef} from 'react';
import type {AutomationEmailStats} from '@tryghost/admin-x-framework/api/automations';
import {Button} from '@tryghost/shade/components';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {EmailPerformance} from './email-analytics';
import {NodeHeader} from './flow-node-shell';

// Right-side sheet for one email's performance.
//
// Deliberately NOT the old step sidebar: editing (subject, content, delete) now
// lives in the node card, so this panel does one thing — a deeper read of how
// that email performed. It exists because the full report (KPIs, donut, and the
// top-clicked-links list) is far too much content for an in-canvas popover,
// which is still the right size for the trigger's goals.
//
// Chrome matches the shipped step sidebar (automations/components/canvas/
// step-sidebar.tsx): an absolutely positioned aside that slides in over the
// canvas rather than a modal Sheet, so the flow stays visible and interactive
// behind it.

export interface SheetEmail {
    actionId: string;
    subject: string;
    stats: AutomationEmailStats;
}

interface EmailAnalyticsSheetProps {
    email: SheetEmail | null;
    onClose: () => void;
}

export const EmailAnalyticsSheet: React.FC<EmailAnalyticsSheetProps> = ({email, onClose}) => {
    const sheetRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!email) {
            return;
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        // Two non-obvious choices here, both load-bearing:
        //
        // CAPTURE phase — React Flow pans with d3-zoom, whose pane handler calls
        // stopImmediatePropagation() on pointer down. A bubble-phase listener on
        // document therefore never sees clicks that land on the canvas, which is
        // most of "outside". Capture runs document → target, so we're ahead of it.
        //
        // pointerdown, not click — the click that opened the sheet is still
        // propagating when this listener attaches, so a click listener would catch
        // it and close the sheet the instant it opened. The opening pointerdown has
        // already been and gone.
        const onPointerDown = (event: PointerEvent) => {
            if (!sheetRef.current?.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('pointerdown', onPointerDown, true);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('pointerdown', onPointerDown, true);
        };
    }, [email, onClose]);

    return (
        <aside
            ref={sheetRef}
            aria-hidden={!email}
            aria-label="Email performance"
            className={cn(
                // z-50: above every other layer on the screen. The float concept's
                // top-right controls (⋯ / Edit / Stop) sit exactly where this panel's
                // close button lands, and being later in the DOM they'd otherwise
                // paint over it — leaving no way to dismiss the sheet.
                'absolute inset-y-0 right-0 z-50 flex w-[calc(100%-6rem)] max-w-none translate-x-full flex-col overflow-y-auto border-l border-border-default bg-surface-elevated shadow-sm transition-transform duration-200 ease-out sm:w-[400px]',
                email ? 'translate-x-0' : 'pointer-events-none'
            )}
            data-state={email ? 'open' : 'closed'}
            data-testid="email-analytics-sheet"
        >
            {email && (
                <>
                    {/* The node card's own header component, so the sheet reads as that
                        card opened up: icon chip, single-line title, and the action slot
                        on the far right — here, close. Open envelope rather than the
                        card's closed one: this is the email after it went out. Sticky so
                        close stays reachable while scrolling the links list. */}
                    <div className="sticky top-0 z-10 bg-surface-elevated">
                        <NodeHeader
                            action={
                                <Button aria-label="Close" size="icon" type="button" variant="ghost" onClick={onClose}>
                                    <LucideIcon.X strokeWidth={2} />
                                </Button>
                            }
                            icon={LucideIcon.MailOpen}
                            title="Email analytics"
                        />
                    </div>
                    <div className="px-6 pb-6">
                        <EmailPerformance actionId={email.actionId} stats={email.stats} />
                    </div>
                </>
            )}
        </aside>
    );
};
