import React from 'react';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade';
import {useFeatureFlags} from '@src/lib/feature-flags';
import {useFeedMode} from '@src/hooks/use-feed-mode';

const FeedModeDropdown: React.FC = () => {
    const {isEnabled} = useFeatureFlags();
    const {feedMode, setFeedMode} = useFeedMode(isEnabled('global-feed'));

    return (
        <Select value={feedMode} onValueChange={setFeedMode}>
            <SelectTrigger className='w-[140px]'>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value='discover'>Discover</SelectItem>
                <SelectItem value='following'>Following</SelectItem>
            </SelectContent>
        </Select>
    );
};

export default FeedModeDropdown;
