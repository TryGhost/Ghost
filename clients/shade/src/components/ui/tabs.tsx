import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { DropdownMenuTrigger } from './dropdown-menu';

import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import { type ControlShape, useShade } from '@/providers/shade-context';
import { tabSurfaceVariants } from '@/components/ui/tabs-variants';

type TabsVariant =
  | 'segmented'
  | 'segmented-sm'
  | 'button'
  | 'button-sm'
  | 'underline'
  | 'navbar'
  | 'pill'
  | 'kpis';

interface TabsContextValue {
  variant: TabsVariant;
  controlShape: ControlShape;
}

const TabsContext = React.createContext<TabsContextValue>({
  variant: 'segmented',
  controlShape: 'rounded',
});

export interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  variant?: TabsVariant;
}

const Tabs = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, TabsProps>(
  ({ variant, ...props }, ref) => {
    const { controlShape, admin7Design } = useShade();
    const resolvedVariant = variant ?? (admin7Design ? 'underline' : 'segmented');

    return (
      <TabsContext.Provider value={{ variant: resolvedVariant, controlShape }}>
        <TabsPrimitive.Root ref={ref} {...props} />
      </TabsContext.Provider>
    );
  },
);
Tabs.displayName = TabsPrimitive.Root.displayName;

const tabsListVariants = cva('inline-flex items-center text-muted-foreground', {
  variants: {
    variant: {
      segmented: 'h-(--control-height) rounded-lg bg-muted px-[3px]',
      'segmented-sm': 'h-8 rounded-lg bg-muted px-[3px]',
      button: 'gap-2',
      'button-sm': 'gap-1',
      underline:
        'no-scrollbar w-full max-w-full gap-5 overflow-x-auto border-b border-border-default',
      navbar: 'h-[52px] items-end gap-6',
      pill: '-ml-0.5 h-[30px] gap-px',
      // The `kpis` variant is consumed only by `features/kpi/kpi-tabs.tsx`.
      // Kept here so the cva variant set is in one place; not for direct use by app code.
      kpis: 'border-b ring-0',
    },
    admin7Design: {
      true: '',
      false: '',
    },
  },
  compoundVariants: [
    {
      variant: 'underline',
      admin7Design: true,
      className: 'overflow-y-hidden border-b-0 inset-shadow-[0_-1px_0] inset-shadow-border-default',
    },
    {
      variant: ['button', 'button-sm'],
      admin7Design: true,
      className: 'no-scrollbar max-w-full overflow-x-auto',
    },
  ],
  defaultVariants: {
    variant: 'segmented',
  },
});

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const { variant } = React.useContext(TabsContext);
  const { admin7Design } = useShade();
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(tabsListVariants({ variant, admin7Design, className }))}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const tabsTriggerVariants = cva(
  'inline-flex items-center justify-center px-3 py-1 whitespace-nowrap ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        segmented:
          'h-[calc(var(--control-height)-4px)] rounded-control text-control font-medium data-[state=active]:shadow-md',
        'segmented-sm':
          'h-[26px] rounded-control text-sm font-medium data-[state=active]:shadow-md',
        button:
          'h-(--control-height) gap-1.5 rounded-control py-2 text-control font-medium hover:bg-tab-hover data-[state=active]:bg-tab-active data-[state=active]:hover:bg-tab-active',
        'button-sm':
          'h-6 gap-1.5 rounded-control p-2 text-sm font-medium text-text-secondary hover:bg-tab-hover data-[state=active]:bg-tab-active data-[state=active]:text-foreground data-[state=active]:hover:bg-tab-active',
        underline:
          'relative h-9 px-0 text-control font-semibold text-text-secondary after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground after:opacity-0 after:content-[""] hover:after:opacity-10 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:after:opacity-100!',
        navbar:
          'relative h-[52px] px-px text-control font-semibold text-muted-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground after:opacity-0 after:content-[""] hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:after:opacity-100!',
        pill: 'relative h-[30px] rounded-md px-3 text-control font-medium text-text-secondary hover:bg-tab-hover hover:text-foreground data-[state=active]:bg-tab-active data-[state=active]:text-foreground data-[state=active]:hover:bg-tab-active',
        kpis: 'relative h-full! items-start! rounded-none border-border bg-transparent px-6 py-5 text-foreground ring-0 transition-all after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground after:opacity-0 after:content-[""] first:rounded-tl-md last:rounded-tr-md hover:bg-interactive-hover data-[state=active]:bg-transparent data-[state=active]:after:opacity-100 [&:not(:last-child)]:border-r [&[data-state=active]_[data-type="value"]]:text-foreground',
      },
      controlShape: {
        rounded: '',
        pill: '',
      },
      admin7Design: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: 'underline',
        admin7Design: true,
        className:
          'h-auto py-2.5 text-control-lg font-normal data-[state=active]:font-semibold after:bottom-0 after:h-px',
      },
      {
        variant: ['button', 'button-sm'],
        controlShape: 'pill',
        className: 'rounded-full',
      },
    ],
    defaultVariants: {
      variant: 'segmented',
      controlShape: 'rounded',
    },
  },
);

// Reserve selected-weight text width without duplicating icons, badges or child components.
function renderTabsTriggerLabel(children: React.ReactNode, asChild = false): React.ReactNode {
  if (children === null || children === undefined) {
    return children;
  }

  if (asChild && React.isValidElement<{ children?: React.ReactNode }>(children)) {
    return React.cloneElement(children, undefined, renderTabsTriggerLabel(children.props.children));
  }

  const sizedChildren = React.Children.map(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      const label = typeof child === 'string' ? child.trim() : child;
      if (label === '') {
        return child;
      }

      // Keep boundary spaces in the inline flow between nested label elements.
      const leadingSpace = typeof child === 'string' ? child.match(/^\s*/)?.[0] : undefined;
      const trailingSpace = typeof child === 'string' ? child.match(/\s*$/)?.[0] : undefined;
      return (
        <>
          {leadingSpace}
          <span className="inline-grid">
            <span
              aria-hidden="true"
              className="pointer-events-none invisible col-start-1 row-start-1 font-semibold select-none"
            >
              {label}
            </span>
            <span className="col-start-1 row-start-1">{label}</span>
          </span>
          {trailingSpace}
        </>
      );
    }
    if (
      React.isValidElement<{ children?: React.ReactNode }>(child) &&
      (child.type === React.Fragment || (typeof child.type === 'string' && child.type !== 'svg'))
    ) {
      return React.cloneElement(child, undefined, renderTabsTriggerLabel(child.props.children));
    }
    return child;
  });

  const renderedChildren: React.ReactNode[] = [];
  let labelChildren: React.ReactNode[] = [];
  const flushLabel = () => {
    if (
      labelChildren.length > 1 &&
      labelChildren.some((child) => typeof child !== 'string' || child.trim())
    ) {
      // A single inline context preserves spaces between direct trigger children.
      renderedChildren.push(<span key={`label-${renderedChildren.length}`}>{labelChildren}</span>);
    } else {
      renderedChildren.push(...labelChildren);
    }
    labelChildren = [];
  };

  React.Children.toArray(sizedChildren).forEach((child) => {
    if (
      typeof child === 'string' ||
      typeof child === 'number' ||
      (React.isValidElement(child) &&
        (child.type === React.Fragment || (typeof child.type === 'string' && child.type !== 'svg')))
    ) {
      labelChildren.push(child);
    } else {
      flushLabel();
      renderedChildren.push(child);
    }
  });
  flushLabel();
  return renderedChildren;
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ children, className, onMouseDownCapture, ...props }, ref) => {
  const { variant, controlShape } = React.useContext(TabsContext);
  const { admin7Design } = useShade();
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        tabsTriggerVariants({ variant, controlShape, admin7Design }),
        (variant === 'button' || variant === 'button-sm') &&
          tabSurfaceVariants({
            admin7Design,
            size: variant === 'button-sm' ? 'compact' : 'default',
          }),
        className,
      )}
      onMouseDownCapture={(event) => {
        const activeElement = document.activeElement;
        if (
          activeElement instanceof HTMLElement &&
          activeElement.matches('input, textarea, select, [contenteditable="true"]')
        ) {
          activeElement.blur();
        }
        onMouseDownCapture?.(event);
      }}
      {...props}
    >
      {admin7Design && variant === 'underline'
        ? renderTabsTriggerLabel(children, props.asChild)
        : children}
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

interface TabsTriggerCountProps {
  children: React.ReactNode;
  className?: string;
}

const TabsTriggerCount: React.FC<TabsTriggerCountProps> = ({ className = '', children }) => {
  return (
    <span
      className={cn(
        'mt-px ml-1.5 flex h-5 items-center justify-center rounded-full bg-secondary px-1.5 py-0 text-xs leading-[21px] font-semibold text-text-secondary',
        className,
      )}
    >
      {children}
    </span>
  );
};
TabsTriggerCount.displayName = 'TabsTriggerCount';

const tabsContentVariants = cva(
  'ring-offset-background focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:outline-hidden',
  {
    variants: {
      variant: {
        segmented: '',
        'segmented-sm': '',
        button: '',
        'button-sm': '',
        underline: '',
        navbar: '',
        pill: '',
        kpis: 'ring-0',
      },
    },
    defaultVariants: {
      variant: 'segmented',
    },
  },
);

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => {
  const { variant } = React.useContext(TabsContext);
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(tabsContentVariants({ variant, className }))}
      {...props}
    />
  );
});
TabsContent.displayName = TabsPrimitive.Content.displayName;

interface TabsDropdownTriggerProps extends Omit<
  React.ComponentProps<typeof TabsPrimitive.Trigger>,
  'asChild'
> {
  children: React.ReactNode;
}

const TabsDropdownTrigger = React.forwardRef<HTMLButtonElement, TabsDropdownTriggerProps>(
  ({ children, className, ...props }, ref) => {
    const { variant, controlShape } = React.useContext(TabsContext);
    const { admin7Design } = useShade();
    return (
      <div
        className={cn(
          'relative rounded-control hover:bg-tab-hover',
          (variant === 'button' || variant === 'button-sm') &&
            controlShape === 'pill' &&
            'rounded-full',
        )}
      >
        <TabsPrimitive.Trigger
          ref={ref}
          className={cn(
            tabsTriggerVariants({ variant, controlShape, admin7Design }),
            (variant === 'button' || variant === 'button-sm') &&
              tabSurfaceVariants({
                admin7Design,
                size: variant === 'button-sm' ? 'compact' : 'default',
              }),
            className,
          )}
          {...props}
        >
          <div className="flex items-center gap-2">
            {admin7Design && variant === 'underline' ? renderTabsTriggerLabel(children) : children}
          </div>
        </TabsPrimitive.Trigger>
        <DropdownMenuTrigger
          className="absolute inset-0 size-full cursor-pointer"
          onClick={(e) => {
            // Stop propagation to prevent tab change
            e.preventDefault();
          }}
        />
      </div>
    );
  },
);
TabsDropdownTrigger.displayName = 'TabsDropdownTrigger';

export { Tabs, TabsList, TabsTrigger, TabsTriggerCount, TabsContent, TabsDropdownTrigger };
