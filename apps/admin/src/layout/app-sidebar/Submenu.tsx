import React from 'react';
import { Button, LucideIcon } from '@tryghost/shade';
import { SubmenuProvider, useSubmenuHasActiveChild, useRegisterActiveChild } from './SubmenuContext';
import { useNavigationExpanded } from './hooks/use-navigation-preferences';
import { useIsActiveLink } from './useIsActiveLink';

interface SubmenuRenderProps {
    isExpanded: boolean;
    setIsExpanded: (expanded: boolean) => Promise<void>;
    id: string;
}

interface SubmenuProps {
    /** Key for storing expanded state in preferences */
    id: string;
    /** The submenu content - can be a render function receiving expanded state */
    children: React.ReactNode | ((props: SubmenuRenderProps) => React.ReactNode);
}

/**
 * Minimal submenu component that provides:
 * - Context for parent/child active state tracking
 * - Expandable/collapsible container
 * 
 * Use with existing NavMenuItem components for full composability.
 */
export function Submenu({ id, children }: SubmenuProps) {
    const [isExpanded, setIsExpanded] = useNavigationExpanded(id);

    return (
        <SubmenuProvider>
            {typeof children === 'function' ? children({ isExpanded, setIsExpanded, id }) : children}
        </SubmenuProvider>
    );
}

interface SubmenuToggleProps {
    /** The submenu ID this toggle controls */
    submenuId: string;
    /** Whether the submenu is expanded */
    isExpanded: boolean;
    /** Callback to toggle the submenu */
    onToggle: () => void;
    /** Accessible label */
    label: string;
}

/**
 * Toggle button for expanding/collapsing a submenu
 */
Submenu.Toggle = function SubmenuToggle({ submenuId, isExpanded, onToggle, label }: SubmenuToggleProps) {
    return (
        <Button
            aria-controls={`${submenuId}-content`}
            aria-expanded={isExpanded}
            aria-label={label}
            variant="ghost"
            size="icon"
            className="!h-[34px] absolute sidebar:opacity-0 group-hover/menu-item:opacity-100 focus-visible:opacity-100 transition-all left-3 top-0 p-0 h-9 w-auto text-sidebar-accent-foreground hover:text-gray-black hover:bg-transparent"
            onClick={() => void onToggle()}
        >
            <LucideIcon.ChevronRight
                size={16}
                className={`transition-all ${isExpanded && 'rotate-[90deg]'}`}
            />
        </Button>
    );
};

interface SubmenuItemsProps {
    /** The submenu ID */
    id: string;
    /** Whether the submenu is expanded */
    isExpanded: boolean;
    /** The submenu items */
    children: React.ReactNode;
}

/**
 * Container for submenu items with expand/collapse animation
 */
Submenu.Items = function SubmenuItems({ id, isExpanded, children }: SubmenuItemsProps) {
    return (
        <div
            id={`${id}-content`}
            className={`grid transition-all duration-200 ease-out ${isExpanded ? 'grid-rows-[1fr] mb-5' : 'grid-rows-[0fr] mb-0'}`}
        >
            <div className="overflow-hidden">
                {children}
            </div>
        </div>
    );
};

/**
 * Hook for parent links to suppress their active state when a child is active
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSubmenuParent(path?: string) {
    const linkIsActive = useIsActiveLink({ path });
    const hasActiveChild = useSubmenuHasActiveChild();
    
    return {
        isActive: hasActiveChild ? false : linkIsActive
    };
}

/**
 * Hook for submenu items to register themselves as active
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSubmenuItem(path?: string) {
    const linkIsActive = useIsActiveLink({ path });
    useRegisterActiveChild(linkIsActive);
    
    return {
        isActive: linkIsActive
    };
}
