import React from 'react';
import {Button, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, LucideIcon} from '@tryghost/shade';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

const AUDIENCE_BITS = {
    PUBLIC: 1 << 0, // 1
    FREE: 1 << 1, // 2
    PAID: 1 << 2 // 4
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
            return 'Audience';
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
                <Button variant="outline"><LucideIcon.User2 /><span className='lowercase first-letter:capitalize'>{getAudienceLabel()}</span></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className="w-56">
                <DropdownMenuLabel>Filter by audience</DropdownMenuLabel>
                <DropdownMenuSeparator />
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
