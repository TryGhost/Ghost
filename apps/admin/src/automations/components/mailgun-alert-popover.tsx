import React from 'react';
import {MAILGUN_PENDING_KEY, MAILGUN_RETURN_KEY} from '@/automations/hooks/use-mailgun-alert';
import {Popover, PopoverContent, PopoverTrigger} from '@tryghost/shade/components';
import {Link} from '@tryghost/admin-x-framework';

// Before sending the user to Settings → Email → Mailgun, remember where they were so the settings exit
// button can bring them straight back, and flag a connect attempt so the editor plays the "connected"
// choreography on return.
const rememberConnectOrigin = (): void => {
    try {
        sessionStorage.setItem(MAILGUN_RETURN_KEY, window.location.hash.replace(/^#/, '') || '/');
        sessionStorage.setItem(MAILGUN_PENDING_KEY, '1');
    } catch {
        // sessionStorage can be unavailable (private mode) — the link still works, just without the
        // return-to-origin + choreography niceties.
    }
};

// A dead-simple popover surfacing the bulk-email (Mailgun) issue. The trigger is passed in, so the
// same content opens from the header (next to Publish) and from each affected email node. Kept to a
// single issue for now — if automations ever need to show several at once, this is where a
// summarised list would live.
//
// It's controlled with a capture-phase outside-click listener because React Flow's canvas swallows
// pointer events before Radix's built-in dismiss layer sees them, so on the canvas the popover
// wouldn't otherwise close on an outside click. The capture phase runs before the canvas handlers.
// Triggers opt out of the close via `data-mailgun-trigger` so Radix handles their toggle.
export const MailgunAlertPopover: React.FC<{children: React.ReactNode}> = ({children}) => {
    const [open, setOpen] = React.useState(false);
    const contentRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!open) {
            return;
        }
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || contentRef.current?.contains(target) || target.closest('[data-mailgun-trigger]')) {
                return;
            }
            setOpen(false);
        };
        document.addEventListener('pointerdown', handlePointerDown, true);
        return () => document.removeEventListener('pointerdown', handlePointerDown, true);
    }, [open]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{children}</PopoverTrigger>
            <PopoverContent ref={contentRef} align='end' className='flex w-72 flex-col gap-2 text-sm text-foreground'>
                <span>Self-hosted sites need Mailgun connected to send automation emails.</span>
                <Link className='font-medium underline underline-offset-2 hover:no-underline' to='/settings/mailgun' onClick={rememberConnectOrigin}>Connect Mailgun</Link>
            </PopoverContent>
        </Popover>
    );
};
