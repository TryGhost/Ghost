import React from 'react';
import {ChevronDown} from 'lucide-react';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Switch} from '@tryghost/shade/components';
import {type EditableItem, type NavigationItem, type NavigationItemErrors, type NavigationItemVisibility} from '../../../../hooks/site/use-navigation-editor';
import {
    type VisibilityAudience,
    getAudienceVisibility,
    getNavigationVisibility,
    getVisibilityFromAudiences,
    getVisibilityLabel,
    paidVisibilityValues,
    visibilityAudienceOptions
} from './navigation-visibility';

type NavigationVisibilityDropdownProps = {
    idPrefix: string;
    item: EditableItem;
    clearError?: (key: keyof NavigationItemErrors) => void;
    updateItem?: (item: Partial<NavigationItem>) => void;
    showPaidVisibility: boolean;
}

const NavigationVisibilityDropdown: React.FC<NavigationVisibilityDropdownProps> = ({idPrefix, item, clearError, updateItem, showPaidVisibility}) => {
    const visibility = getNavigationVisibility(item.visibility);
    const visibilityLabel = getVisibilityLabel(visibility);
    const visibilityLabelId = `${idPrefix}-visibility-${item.id}`;
    const visibilityErrorId = `${visibilityLabelId}-error`;
    const audienceVisibility = getAudienceVisibility(visibility, showPaidVisibility);

    const updateVisibility = (newVisibility: NavigationItemVisibility) => {
        clearError?.('visibility');
        updateItem?.({visibility: newVisibility});
    };

    const updateAudienceVisibility = (audience: VisibilityAudience, checked: boolean) => {
        const nextAudiences = {
            ...audienceVisibility,
            [audience]: checked
        };
        const nextVisibility = getVisibilityFromAudiences(nextAudiences);

        if (!showPaidVisibility && paidVisibilityValues.includes(nextVisibility)) {
            return;
        }

        updateVisibility(nextVisibility);
    };

    return (
        <>
            <label className="sr-only" id={visibilityLabelId}>Visibility</label>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        aria-describedby={item.errors.visibility ? visibilityErrorId : undefined}
                        aria-invalid={!!item.errors.visibility}
                        aria-labelledby={visibilityLabelId}
                        className="flex h-[38px] w-full items-center justify-between rounded-lg border-transparent bg-grey-100 px-3 text-md text-black hover:bg-grey-100 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-hidden dark:bg-grey-900 dark:text-white dark:hover:bg-grey-900"
                        data-testid='navigation-item-visibility'
                        type='button'
                    >
                        <span className='truncate'>{visibilityLabel}</span>
                        <ChevronDown aria-hidden='true' className='size-4 opacity-80' />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='z-[300] w-[190px] rounded-lg p-2' sideOffset={6}>
                    <div className='flex flex-col'>
                        {visibilityAudienceOptions.filter(option => option.key !== 'paid-members' || showPaidVisibility).map((option) => {
                            const checked = audienceVisibility[option.key];

                            return (
                                <DropdownMenuItem
                                    key={option.key}
                                    className='flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm text-grey-900 dark:text-grey-100'
                                    onSelect={(event) => {
                                        event.preventDefault();
                                        updateAudienceVisibility(option.key, !checked);
                                    }}
                                >
                                    <span>{option.label}</span>
                                    <Switch
                                        aria-label={option.label}
                                        checked={checked}
                                        size='sm'
                                        onCheckedChange={isChecked => updateAudienceVisibility(option.key, isChecked)}
                                        onClick={event => event.stopPropagation()}
                                    />
                                </DropdownMenuItem>
                            );
                        })}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
            {item.errors.visibility && <div className='mt-1 text-xs text-red' id={visibilityErrorId} role='alert'>{item.errors.visibility}</div>}
        </>
    );
};

export default NavigationVisibilityDropdown;
