import React from 'react';
import { Button, LucideIcon } from '@tryghost/shade';
import { NavMenuItem } from './NavMenuItem';
import { SubmenuProvider } from './SubmenuContext';
import { useNavigationExpanded } from './hooks/use-navigation-preferences';

interface SubmenuProps {
    /** The main label for the submenu */
    label: string;
    /** The route for the parent link */
    to: string;
    /** Optional icon to show before the label */
    icon?: React.ReactNode;
    /** Optional action button (e.g., "Create new" button) */
    action?: React.ReactNode;
    /** The submenu items */
    children: React.ReactNode;
    /** Key for storing expanded state in preferences */
    storageKey: string;
}

/**
 * A submenu component that handles:
 * - Expandable/collapsible behavior with chevron
 * - Parent link that's suppressed when a child is active
 * - Automatic child registration via context
 */
export function Submenu({ label, to, icon, action, children, storageKey }: SubmenuProps) {
    const [isExpanded, setIsExpanded] = useNavigationExpanded(storageKey);

    return (
        <SubmenuProvider>
            <NavMenuItem>
                <Button
                    aria-controls={`${storageKey}-submenu`}
                    aria-expanded={isExpanded}
                    aria-label={`Toggle ${label} submenu`}
                    variant="ghost"
                    size="icon"
                    className="!h-[34px] absolute sidebar:opacity-0 group-hover/menu-item:opacity-100 focus-visible:opacity-100 transition-all left-3 top-0 p-0 h-9 w-auto text-sidebar-accent-foreground hover:text-gray-black hover:bg-transparent"
                    onClick={() => void setIsExpanded(!isExpanded)}
                >
                    <LucideIcon.ChevronRight
                        size={16}
                        className={`transition-all ${isExpanded && 'rotate-[90deg]'}`}
                    />
                </Button>
                <NavMenuItem.Link to={to} suppressWhenChildActive>
                    {icon && <span className="opacity-0 sidebar:opacity-100 sidebar:group-hover/menu-item:opacity-0 pointer-events-none transition-all">{icon}</span>}
                    <NavMenuItem.Label>{label}</NavMenuItem.Label>
                </NavMenuItem.Link>
                {action}
            </NavMenuItem>

            {/* Submenu items */}
            <div
                id={`${storageKey}-submenu`}
                className={`grid transition-all duration-200 ease-out ${isExpanded ? 'grid-rows-[1fr] mb-5' : 'grid-rows-[0fr] mb-0'}`}
            >
                <div className="overflow-hidden">
                    {children}
                </div>
            </div>
        </SubmenuProvider>
    );
}

interface SubmenuItemProps {
    /** The route for this submenu item */
    to: string;
    /** The label to display */
    children: React.ReactNode;
    /** Optional custom className */
    className?: string;
}

/**
 * A submenu item that automatically registers itself as active
 */
Submenu.Item = function SubmenuItem({ to, children, className = 'pl-9' }: SubmenuItemProps) {
    return (
        <NavMenuItem>
            <NavMenuItem.Link to={to} className={className} isSubmenuItem>
                {children}
            </NavMenuItem.Link>
        </NavMenuItem>
    );
};
