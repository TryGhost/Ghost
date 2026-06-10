import React, {useState} from 'react';
import {Button, Popover, PopoverContent, PopoverTrigger} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';

export type MemberAction = 'impersonate' | 'logout' | 'disable-commenting' | 'enable-commenting' | 'delete';

function MenuButton({onClick, destructive, children}: {
    onClick: () => void;
    destructive?: boolean;
    children: React.ReactNode;
}) {
    return (
        <button
            className={`flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent ${destructive ? 'text-destructive' : ''}`}
            type="button"
            onClick={onClick}
        >
            {children}
        </button>
    );
}

/**
 * The member actions dropdown (settings cog). Uses a popover with plain
 * buttons rather than a menu so the items expose the button role the
 * Ember screen exposes (and the shared Playwright suite relies on).
 */
export function MemberActionsMenu({canComment, onAction}: {
    canComment: boolean;
    onAction: (action: MemberAction) => void;
}) {
    const [open, setOpen] = useState(false);

    const handleAction = (action: MemberAction) => {
        setOpen(false);
        onAction(action);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button aria-label="Member actions" data-testid="member-actions" title="Member actions" variant="outline">
                    <LucideIcon.Settings className="size-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1">
                <MenuButton onClick={() => handleAction('impersonate')}>Impersonate</MenuButton>
                <MenuButton onClick={() => handleAction('logout')}>Sign out of all devices</MenuButton>
                {canComment ? (
                    <MenuButton onClick={() => handleAction('disable-commenting')}>Disable commenting</MenuButton>
                ) : (
                    <MenuButton onClick={() => handleAction('enable-commenting')}>Enable commenting</MenuButton>
                )}
                <MenuButton destructive onClick={() => handleAction('delete')}>Delete member</MenuButton>
            </PopoverContent>
        </Popover>
    );
}
