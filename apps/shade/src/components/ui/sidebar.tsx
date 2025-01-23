import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {VariantProps, cva} from 'class-variance-authority';
import {PanelLeft} from 'lucide-react';

import {useIsMobile} from '@/hooks/use-mobile';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Separator} from '@/components/ui/separator';
import {Sheet, SheetContent} from '@/components/ui/sheet';
import {Skeleton} from '@/components/ui/skeleton';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@/components/ui/tooltip';

const SIDEBAR_COOKIE_NAME = 'sidebar:state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = '16rem';
const SIDEBAR_WIDTH_MOBILE = '18rem';
const SIDEBAR_WIDTH_ICON = '3rem';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';
const SIDEBAR_MENU_HEIGHT = '9';

type SidebarContext = {
    state: 'expanded' | 'collapsed'
    open: boolean
    setOpen: (open: boolean) => void
    openMobile: boolean
    setOpenMobile: (open: boolean) => void
    isMobile: boolean
    toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContext | null>(null);

function useSidebar() {
    const context = React.useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider.');
    }

    return context;
}

const SidebarProvider = React.forwardRef<
HTMLDivElement,
React.ComponentProps<'div'> & {
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
        }
        >(
        (
            {
                defaultOpen = true,
                open: openProp,
                onOpenChange: setOpenProp,
                className,
                style,
                children,
                ...props
            },
            ref
        ) => {
            const isMobile = useIsMobile();
            const [openMobile, setOpenMobile] = React.useState(false);

            // This is the internal state of the sidebar.
            // We use openProp and setOpenProp for control from outside the component.
            const [_open, _setOpen] = React.useState(defaultOpen);
            const open = openProp ?? _open;
            const setOpen = React.useCallback(
                (newValue: boolean | ((value: boolean) => boolean)) => {
                    const openState = typeof newValue === 'function' ? newValue(open) : newValue;
                    if (setOpenProp) {
                        setOpenProp(openState);
                    } else {
                        _setOpen(openState);
                    }

                    // This sets the cookie to keep the sidebar state.
                    document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
                },
                [setOpenProp, open]
            );

            // Helper to toggle the sidebar.
            const toggleSidebar = React.useCallback(() => {
                return isMobile
                    ? setOpenMobile(prevOpen => !prevOpen)
                    : setOpen(prevOpen => !prevOpen);
            }, [isMobile, setOpen, setOpenMobile]);

            // Adds a keyboard shortcut to toggle the sidebar.
            React.useEffect(() => {
                const handleKeyDown = (event: KeyboardEvent) => {
                    if (
                        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
                    ) {
                        event.preventDefault();
                        toggleSidebar();
                    }
                };

                window.addEventListener('keydown', handleKeyDown);
                return () => window.removeEventListener('keydown', handleKeyDown);
            }, [toggleSidebar]);

            // We add a state so that we can do data-state="expanded" or "collapsed".
            // This makes it easier to style the sidebar with Tailwind classes.
            const state = open ? 'expanded' : 'collapsed';

            const contextValue = React.useMemo<SidebarContext>(
                () => ({
                    state,
                    open,
                    setOpen,
                    isMobile,
                    openMobile,
                    setOpenMobile,
                    toggleSidebar
                }),
                [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
            );

            return (
                <SidebarContext.Provider value={contextValue}>
                    <TooltipProvider delayDuration={0}>
                        <div
                            ref={ref}
                            className={cn(
                                'group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar',
                                className
                            )}
                            style={
            {
                '--sidebar-width': SIDEBAR_WIDTH,
                '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
                ...style
            } as React.CSSProperties
                            }
                            {...props}
                        >
                            {children}
                        </div>
                    </TooltipProvider>
                </SidebarContext.Provider>
            );
        }
        );
SidebarProvider.displayName = 'SidebarProvider';

const Sidebar = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<'div'> & {
        side?: 'left' | 'right'
        variant?: 'sidebar' | 'floating' | 'inset'
        collapsible?: 'offcanvas' | 'icon' | 'none'
    }
>(
    (
        {
            side = 'left',
            variant = 'sidebar',
            collapsible = 'offcanvas',
            className,
            children,
            ...props
        },
        ref
    ) => {
        const {isMobile, state, openMobile, setOpenMobile} = useSidebar();

        if (collapsible === 'none') {
            return (
                <div
                    ref={ref}
                    className={cn(
                        'flex h-full w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground',
                        className
                    )}
                    {...props}
                >
                    {children}
                </div>
            );
        }

        if (isMobile) {
            return (
                <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
                    <SheetContent
                        className="w-[--sidebar-width] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
                        data-mobile="true"
                        data-sidebar="sidebar"
                        side={side}
                        style={
            {
                '--sidebar-width': SIDEBAR_WIDTH_MOBILE
            } as React.CSSProperties
                        }
                    >
                        <div className="flex h-full w-full flex-col">{children}</div>
                    </SheetContent>
                </Sheet>
            );
        }

        return (
            <div
                ref={ref}
                className="group peer hidden text-sidebar-foreground md:block"
                data-collapsible={state === 'collapsed' ? collapsible : ''}
                data-side={side}
                data-state={state}
                data-variant={variant}
            >
                {/* This is what handles the sidebar gap on desktop */}
                <div
                    className={cn(
                        'duration-200 relative h-svh w-[--sidebar-width] bg-transparent transition-[width] ease-linear',
                        'group-data-[collapsible=offcanvas]:w-0',
                        'group-data-[side=right]:rotate-180',
                        variant === 'floating' || variant === 'inset'
                            ? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]'
                            : 'group-data-[collapsible=icon]:w-[--sidebar-width-icon]'
                    )}
                />
                <div
                    className={cn(
                        'duration-200 fixed inset-y-0 z-10 hidden h-svh w-[--sidebar-width] transition-[left,right,width] ease-linear md:flex',
                        side === 'left'
                            ? 'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
                            : 'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
                        // Adjust the padding for floating and inset variants.
                        variant === 'floating' || variant === 'inset'
                            ? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]'
                            : 'group-data-[collapsible=icon]:w-[--sidebar-width-icon] group-data-[side=left]:border-r group-data-[side=right]:border-l',
                        className
                    )}
                    {...props}
                >
                    <div
                        className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"
                        data-sidebar="sidebar"
                    >
                        {children}
                    </div>
                </div>
            </div>
        );
    }
);
Sidebar.displayName = 'Sidebar';

const SidebarTrigger = React.forwardRef<
    React.ElementRef<typeof Button>,
    React.ComponentProps<typeof Button>
>(({className, onClick, ...props}, ref) => {
    const {toggleSidebar} = useSidebar();

    return (
        <Button
            ref={ref}
            className={cn('h-7 w-7', className)}
            data-sidebar="trigger"
            size="icon"
            variant="ghost"
            onClick={(event) => {
                onClick?.(event);
                toggleSidebar();
            }}
            {...props}
        >
            <PanelLeft />
            <span className="sr-only">Toggle Sidebar</span>
        </Button>
    );
});
SidebarTrigger.displayName = 'SidebarTrigger';

const SidebarRail = React.forwardRef<
    HTMLButtonElement,
    React.ComponentProps<'button'>
>(({className, ...props}, ref) => {
    const {toggleSidebar} = useSidebar();

    return (
        <button
            ref={ref}
            aria-label="Toggle Sidebar"
            className={cn(
                'absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex',
                '[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize',
                '[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
                'group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar',
                '[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
                '[[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
                className
            )}
            data-sidebar="rail"
            tabIndex={-1}
            title="Toggle Sidebar"
            type='button'
            onClick={toggleSidebar}
            {...props}
        />
    );
});
SidebarRail.displayName = 'SidebarRail';

const SidebarInset = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<'main'>
>(({className, ...props}, ref) => {
    return (
        <main
            ref={ref}
            className={cn(
                'relative flex min-h-svh flex-1 flex-col bg-background',
                'peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow',
                className
            )}
            {...props}
        />
    );
});
SidebarInset.displayName = 'SidebarInset';

const SidebarInput = React.forwardRef<
    React.ElementRef<typeof Input>,
    React.ComponentProps<typeof Input>
>(({className, ...props}, ref) => {
    return (
        <Input
            ref={ref}
            className={cn(
                'w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                `h-${SIDEBAR_MENU_HEIGHT}`,
                className
            )}
            data-sidebar="input"
            {...props}
        />
    );
});
SidebarInput.displayName = 'SidebarInput';

const SidebarHeader = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<'div'>
>(({className, ...props}, ref) => {
    return (
        <div
            ref={ref}
            className={cn('flex flex-col gap-2 p-2', className)}
            data-sidebar="header"
            {...props}
        />
    );
});
SidebarHeader.displayName = 'SidebarHeader';

const SidebarFooter = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<'div'>
>(({className, ...props}, ref) => {
    return (
        <div
            ref={ref}
            className={cn('flex flex-col gap-2 p-2', className)}
            data-sidebar="footer"
            {...props}
        />
    );
});
SidebarFooter.displayName = 'SidebarFooter';

const SidebarSeparator = React.forwardRef<
    React.ElementRef<typeof Separator>,
    React.ComponentProps<typeof Separator>
>(({className, ...props}, ref) => {
    return (
        <Separator
            ref={ref}
            className={cn('mx-2 w-auto bg-sidebar-border', className)}
            data-sidebar="separator"
            {...props}
        />
    );
});
SidebarSeparator.displayName = 'SidebarSeparator';

const SidebarContent = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<'div'>
>(({className, ...props}, ref) => {
    return (
        <div
            ref={ref}
            className={cn(
                'flex min-h-0 flex-1 flex-col gap-5 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
                className
            )}
            data-sidebar="content"
            {...props}
        />
    );
});
SidebarContent.displayName = 'SidebarContent';

const SidebarGroup = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<'div'>
>(({className, ...props}, ref) => {
    return (
        <div
            ref={ref}
            className={cn('relative flex w-full min-w-0 flex-col p-2', className)}
            data-sidebar="group"
            {...props}
        />
    );
});
SidebarGroup.displayName = 'SidebarGroup';

const SidebarGroupLabel = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<'div'> & { asChild?: boolean }
>(({className, asChild = false, ...props}, ref) => {
    const Comp = asChild ? Slot : 'div';

    return (
        <Comp
            ref={ref}
            className={cn(
                'duration-200 flex shrink-0 items-center rounded-md px-3 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
                'group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0',
                `h-${SIDEBAR_MENU_HEIGHT}`,
                className
            )}
            data-sidebar="group-label"
            {...props}
        />
    );
});
SidebarGroupLabel.displayName = 'SidebarGroupLabel';

const SidebarGroupAction = React.forwardRef<
    HTMLButtonElement,
    React.ComponentProps<'button'> & { asChild?: boolean }
>(({className, asChild = false, ...props}, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
        <Comp
            ref={ref}
            className={cn(
                'absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
                // Increases the hit area of the button on mobile.
                'after:absolute after:-inset-2 after:md:hidden',
                'group-data-[collapsible=icon]:hidden',
                className
            )}
            data-sidebar="group-action"
            {...props}
        />
    );
});
SidebarGroupAction.displayName = 'SidebarGroupAction';

const SidebarGroupContent = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<'div'>
>(({className, ...props}, ref) => (
    <div
        ref={ref}
        className={cn('w-full text-sm', className)}
        data-sidebar="group-content"
        {...props}
    />
));
SidebarGroupContent.displayName = 'SidebarGroupContent';

const SidebarMenu = React.forwardRef<
    HTMLUListElement,
    React.ComponentProps<'ul'>
>(({className, ...props}, ref) => (
    <ul
        ref={ref}
        className={cn('flex w-full min-w-0 flex-col gap-px', className)}
        data-sidebar="menu"
        {...props}
    />
));
SidebarMenu.displayName = 'SidebarMenu';

const SidebarMenuItem = React.forwardRef<
    HTMLLIElement,
    React.ComponentProps<'li'>
>(({className, ...props}, ref) => (
    <li
        ref={ref}
        className={cn('group/menu-item relative', className)}
        data-sidebar="menu-item"
        {...props}
    />
));
SidebarMenuItem.displayName = 'SidebarMenuItem';

const sidebarMenuButtonVariants = cva(
    'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md px-3 py-2 text-left text-md font-medium text-gray-800 outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
    {
        variants: {
            variant: {
                default: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                outline:
        'bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]'
            },
            size: {
                default: `h-${SIDEBAR_MENU_HEIGHT} text-md`,
                sm: 'h-7 text-xs',
                lg: 'h-12 text-sm group-data-[collapsible=icon]:!p-0'
            }
        },
        defaultVariants: {
            variant: 'default',
            size: 'default'
        }
    }
);

const SidebarMenuButton = React.forwardRef<
HTMLButtonElement,
React.ComponentProps<'button'> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: string | React.ComponentProps<typeof TooltipContent>
} & VariantProps<typeof sidebarMenuButtonVariants>
>(
    (
        {
            asChild = false,
            isActive = false,
            variant = 'default',
            size = 'default',
            tooltip,
            className,
            ...props
        },
        ref
    ) => {
        const Comp = asChild ? Slot : 'button';
        const {isMobile, state} = useSidebar();

        const button = (
            <Comp
                ref={ref}
                className={cn(sidebarMenuButtonVariants({variant, size}), className)}
                data-active={isActive}
                data-sidebar="menu-button"
                data-size={size}
                {...props}
            />
        );

        if (!tooltip) {
            return button;
        }

        if (typeof tooltip === 'string') {
            tooltip = {
                children: tooltip
            };
        }

        return (
            <Tooltip>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent
                    align="center"
                    hidden={state !== 'collapsed' || isMobile}
                    side="right"
                    {...tooltip}
                />
            </Tooltip>
        );
    }
);
SidebarMenuButton.displayName = 'SidebarMenuButton';

const SidebarMenuAction = React.forwardRef<
HTMLButtonElement,
React.ComponentProps<'button'> & {
    asChild?: boolean
    showOnHover?: boolean
}
>(({className, asChild = false, showOnHover = false, ...props}, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
        <Comp
            ref={ref}
            className={cn(
                'absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0',
                // Increases the hit area of the button on mobile.
                'after:absolute after:-inset-2 after:md:hidden',
                'peer-data-[size=sm]/menu-button:top-1',
                'peer-data-[size=default]/menu-button:top-1.5',
                'peer-data-[size=lg]/menu-button:top-2.5',
                'group-data-[collapsible=icon]:hidden',
                showOnHover &&
        'group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0',
                className
            )}
            data-sidebar="menu-action"
            {...props}
        />
    );
});
SidebarMenuAction.displayName = 'SidebarMenuAction';

const SidebarMenuBadge = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<'div'>
>(({className, ...props}, ref) => (
    <div
        ref={ref}
        className={cn(
            'absolute right-2 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-sm font-medium tabular-nums text-gray-600 select-none pointer-events-none',
            'peer-hover/menu-button: peer-data-[active=true]/menu-button:text-sidebar-accent-foreground',
            'peer-data-[size=sm]/menu-button:top-1.5',
            'peer-data-[size=default]/menu-button:top-2',
            'peer-data-[size=lg]/menu-button:top-3',
            'group-data-[collapsible=icon]:hidden',
            className
        )}
        data-sidebar="menu-badge"
        {...props}
    />
));
SidebarMenuBadge.displayName = 'SidebarMenuBadge';

const SidebarMenuSkeleton = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<'div'> & {
        showIcon?: boolean
    }
>(({className, showIcon = false, ...props}, ref) => {
// Random width between 50 to 90%.
    const width = React.useMemo(() => {
        return `${Math.floor(Math.random() * 40) + 50}%`;
    }, []);

    return (
        <div
            ref={ref}
            className={cn('rounded-md flex gap-2 px-3 items-center', `h-${SIDEBAR_MENU_HEIGHT}`, className)}
            data-sidebar="menu-skeleton"
            {...props}
        >
            {showIcon && (
                <Skeleton
                    className="size-4 rounded-md"
                    data-sidebar="menu-skeleton-icon"
                />
            )}
            <Skeleton
                className="h-4 max-w-[--skeleton-width] flex-1"
                data-sidebar="menu-skeleton-text"
                style={
        {
            '--skeleton-width': width
        } as React.CSSProperties
                }
            />
        </div>
    );
});
SidebarMenuSkeleton.displayName = 'SidebarMenuSkeleton';

const SidebarMenuSub = React.forwardRef<
HTMLUListElement,
React.ComponentProps<'ul'>
>(({className, ...props}, ref) => (
    <ul
        ref={ref}
        className={cn(
            'mx-3.5 flex min-w-0 translate-x-px flex-col gap-px border-l border-sidebar-border px-3 py-0.5',
            'group-data-[collapsible=icon]:hidden',
            className
        )}
        data-sidebar="menu-sub"
        {...props}
    />
));
SidebarMenuSub.displayName = 'SidebarMenuSub';

const SidebarMenuSubItem = React.forwardRef<
HTMLLIElement,
React.ComponentProps<'li'>
>(({...props}, ref) => <li ref={ref} {...props} />);
SidebarMenuSubItem.displayName = 'SidebarMenuSubItem';

const SidebarMenuSubButton = React.forwardRef<
HTMLAnchorElement,
React.ComponentProps<'a'> & {
    asChild?: boolean
    size?: 'sm' | 'md'
    isActive?: boolean
}
>(({asChild = false, size = 'md', isActive, className, ...props}, ref) => {
    const Comp = asChild ? Slot : 'a';

    return (
        <Comp
            ref={ref}
            className={cn(
                'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-3 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground',
                'data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground',
                size === 'sm' && 'text-xs',
                size === 'md' && 'text-sm',
                'group-data-[collapsible=icon]:hidden',
                className
            )}
            data-active={isActive}
            data-sidebar="menu-sub-button"
            data-size={size}
            {...props}
        />
    );
});
SidebarMenuSubButton.displayName = 'SidebarMenuSubButton';

export {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupAction,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInput,
    SidebarInset,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSkeleton,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarProvider,
    SidebarRail,
    SidebarSeparator,
    SidebarTrigger,
    useSidebar
};
