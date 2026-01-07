import React from 'react';
import {ALL_AUDIENCES, AUDIENCE_BITS} from '@src/utils/constants';
import {Button, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger, LucideIcon} from '@tryghost/shade';
import {useAppContext} from '@src/providers/posts-app-context';
import {useGlobalData} from '@src/providers/post-analytics-context';

export const AUDIENCE_TYPES = [
    {name: 'Public visitors', value: 'undefined', bit: AUDIENCE_BITS.PUBLIC},
    {name: 'Free members', value: 'free', bit: AUDIENCE_BITS.FREE},
    {name: 'Paid members', value: 'paid', bit: AUDIENCE_BITS.PAID}
];

/**
 * Derive audience bitmask from filter values
 * If no filter values provided, returns ALL_AUDIENCES
 */
export const getAudienceFromFilterValues = (filterValues: string[] | undefined): number => {
    if (!filterValues || filterValues.length === 0) {
        return ALL_AUDIENCES;
    }

    return AUDIENCE_TYPES
        .filter(opt => filterValues.includes(opt.value))
        .reduce((acc, opt) => acc | opt.bit, 0) || ALL_AUDIENCES;
};

export const getAudienceQueryParam = (audience: number) => {
    const selectedValues = [];

    if ((audience & AUDIENCE_BITS.PUBLIC) !== 0) {
        selectedValues.push(AUDIENCE_TYPES[0].value);
    }
    if ((audience & AUDIENCE_BITS.FREE) !== 0) {
        selectedValues.push(AUDIENCE_TYPES[1].value);
    }
    if ((audience & AUDIENCE_BITS.PAID) !== 0) {
        selectedValues.push(AUDIENCE_TYPES[2].value);
    }

    return selectedValues.join(',');
};

const AudienceSelect: React.FC = () => {
    const {audience, setAudience} = useGlobalData();
    const {appSettings} = useAppContext();

    const toggleAudience = (bit: number) => {
        setAudience(audience ^ bit);
    };

    const isAudienceSelected = (bit: number) => {
        return (audience & bit) !== 0;
    };

    const handleSelect = (e: Event, bit: number) => {
        e.preventDefault();
        toggleAudience(bit);
    };

    const getAudienceLabel = () => {
        const selectedAudiences = [];

        if (isAudienceSelected(AUDIENCE_BITS.PUBLIC)) {
            selectedAudiences.push('Public visitors');
        }
        if (isAudienceSelected(AUDIENCE_BITS.FREE)) {
            selectedAudiences.push('Free members');
        }

        if (!appSettings?.paidMembersEnabled) {
            if (selectedAudiences.length === 2) {
                return 'All audiences';
            }

            if (selectedAudiences.length === 1) {
                if (isAudienceSelected(AUDIENCE_BITS.FREE)) {
                    return 'Free members';
                } else {
                    return 'Public visitors';
                }
            }

            if (selectedAudiences.length === 0) {
                return 'Select audience';
            }
        }

        if (isAudienceSelected(AUDIENCE_BITS.PAID)) {
            selectedAudiences.push('Paid members');
        }

        if (selectedAudiences.length === 0) {
            return 'Select audience';
        }

        if (selectedAudiences.length === 3) {
            return 'All audiences';
        }

        if (isAudienceSelected(AUDIENCE_BITS.FREE) && isAudienceSelected(AUDIENCE_BITS.PAID) && !isAudienceSelected(AUDIENCE_BITS.PUBLIC)) {
            return 'Members-only';
        }

        return selectedAudiences.join(' & ');
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="dropdown"><LucideIcon.User2 /><span className='lowercase first-letter:capitalize'>{getAudienceLabel()}</span></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className="w-full min-w-48">
                <DropdownMenuCheckboxItem
                    checked={isAudienceSelected(AUDIENCE_BITS.PUBLIC)}
                    onSelect={e => handleSelect(e, AUDIENCE_BITS.PUBLIC)}
                >
                    Public visitors
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                    checked={isAudienceSelected(AUDIENCE_BITS.FREE)}
                    onSelect={e => handleSelect(e, AUDIENCE_BITS.FREE)}
                >
                    Free members
                </DropdownMenuCheckboxItem>
                {appSettings?.paidMembersEnabled &&
                    <DropdownMenuCheckboxItem
                        checked={isAudienceSelected(AUDIENCE_BITS.PAID)}
                        onSelect={e => handleSelect(e, AUDIENCE_BITS.PAID)}
                    >
                        Paid members
                    </DropdownMenuCheckboxItem>
                }
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default AudienceSelect;
