import React from 'react';
import {Button, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger, LucideIcon} from '@tryghost/shade';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

const AUDIENCE_BITS = {
    PUBLIC: 1 << 0, // 1
    FREE: 1 << 1, // 2
    PAID: 1 << 2 // 4
};

export const AUDIENCE_TYPES = [
    {name: 'Public visitors', value: 'undefined'},
    {name: 'Free members', value: 'free'},
    {name: 'Paid members', value: 'paid'}
];

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
            <DropdownMenuContent align='end' className="w-56">
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
                <DropdownMenuCheckboxItem
                    checked={isAudienceSelected(AUDIENCE_BITS.PAID)}
                    onSelect={e => handleSelect(e, AUDIENCE_BITS.PAID)}
                >
                    Paid members
                </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default AudienceSelect;
