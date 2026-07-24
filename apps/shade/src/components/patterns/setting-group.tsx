import * as React from 'react';
import {cva, type VariantProps} from 'class-variance-authority';

import {Grid} from '@/components/primitives/grid';
import {Inline} from '@/components/primitives/inline';
import {Stack} from '@/components/primitives/stack';
import {Text} from '@/components/primitives/text';
import {cn} from '@/lib/utils';

const settingGroupVariants = cva(
    'group/setting-group relative flex flex-col gap-6 rounded-xl text-card-foreground transition-all',
    {
        variants: {
            variant: {
                outline: 'border border-border-default bg-card p-5 hover:shadow-sm md:p-7',
                plain: 'bg-transparent'
            },
            highlighted: {
                true: 'shadow-sm',
                false: ''
            }
        },
        defaultVariants: {
            variant: 'outline',
            highlighted: false
        }
    }
);

interface SettingGroupProps extends React.ComponentPropsWithoutRef<'div'>, VariantProps<typeof settingGroupVariants> {
    editing?: boolean;
}

const SettingGroup = React.forwardRef<HTMLDivElement, SettingGroupProps>(({className, variant, highlighted, editing = false, ...props}, ref) => (
    <div
        ref={ref}
        className={cn(settingGroupVariants({variant, highlighted, className}))}
        data-editing={editing}
        {...props}
    />
));
SettingGroup.displayName = 'SettingGroup';

const SettingGroupHeader = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<typeof Inline>>(({className, ...props}, ref) => (
    <Inline
        ref={ref}
        align='start'
        as='div'
        className={cn('relative z-10 w-full', className)}
        gap='lg'
        justify='between'
        {...props}
    />
));
SettingGroupHeader.displayName = 'SettingGroupHeader';

const SettingGroupDetails = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof Stack>>(({className, ...props}, ref) => (
    <Stack ref={ref} className={cn('min-w-0', className)} gap='xs' {...props} />
));
SettingGroupDetails.displayName = 'SettingGroupDetails';

const SettingGroupTitle = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<typeof Text>>(({className, ...props}, ref) => (
    <Text ref={ref} as='h5' className={cn('md:text-lg', className)} leading='supertight' weight='semibold' {...props} />
));
SettingGroupTitle.displayName = 'SettingGroupTitle';

const SettingGroupDescription = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<typeof Text>>(({className, ...props}, ref) => (
    <Text
        ref={ref}
        className={cn('mr-5 hidden text-pretty group-data-[editing=false]/setting-group:block md:block', className)}
        {...props}
    />
));
SettingGroupDescription.displayName = 'SettingGroupDescription';

const SettingGroupActions = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(({className, ...props}, ref) => (
    <div ref={ref} className={cn('shrink-0 [&_button]:text-control!', className)} {...props} />
));
SettingGroupActions.displayName = 'SettingGroupActions';

interface SettingGroupContentProps extends React.ComponentPropsWithoutRef<'div'> {
    columns?: 1 | 2;
}

const SettingGroupContent = React.forwardRef<HTMLDivElement, SettingGroupContentProps>(({children, className, columns = 1, ...props}, ref) => {
    if (columns === 2) {
        return (
            <Grid ref={ref} className={cn('grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2', className)} columns={1} gap='none' {...props}>
                {children}
            </Grid>
        );
    }

    return (
        <Stack ref={ref} className={cn('gap-y-7', className)} gap='none' {...props}>
            {children}
        </Stack>
    );
});
SettingGroupContent.displayName = 'SettingGroupContent';

const SettingGroupValue = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof Stack>>(({className, ...props}, ref) => (
    <Stack ref={ref} className={className} gap='none' {...props} />
));
SettingGroupValue.displayName = 'SettingGroupValue';

const SettingGroupValueTitle = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<typeof Text>>(({className, ...props}, ref) => (
    <Text ref={ref} as='h6' className={cn('text-base', className)} weight='semibold' {...props} />
));
SettingGroupValueTitle.displayName = 'SettingGroupValueTitle';

const SettingGroupValueContent = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<typeof Inline>>(({className, ...props}, ref) => (
    <Inline ref={ref} as='div' className={className} gap='none' {...props} />
));
SettingGroupValueContent.displayName = 'SettingGroupValueContent';

export {
    SettingGroup,
    SettingGroupActions,
    SettingGroupContent,
    SettingGroupDescription,
    SettingGroupDetails,
    SettingGroupHeader,
    SettingGroupTitle,
    SettingGroupValue,
    SettingGroupValueContent,
    SettingGroupValueTitle,
    settingGroupVariants
};
export type {SettingGroupContentProps, SettingGroupProps};
