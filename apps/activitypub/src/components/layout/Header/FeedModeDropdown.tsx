import React from 'react';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade';
import {useFeedMode} from '@src/hooks/use-feed-mode';

const FeedModeDropdown: React.FC = () => {
    const {feedMode, setFeedMode} = useFeedMode();

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
