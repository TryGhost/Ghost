import React from 'react';
import {Button} from '@tryghost/shade';

export type Topic = 'top' | 'news' | 'technology' | 'business' | 'culture' | 'politics' | 'finance' | 'design';

const TOPICS: {value: Topic; label: string}[] = [
    {value: 'top', label: 'Top'},
    {value: 'news', label: 'News'},
    {value: 'technology', label: 'Technology'},
    {value: 'business', label: 'Business'},
    {value: 'culture', label: 'Culture'},
    {value: 'finance', label: 'Finance'},
    {value: 'design', label: 'Design'}
];

interface TopicFilterProps {
    currentTopic: Topic;
    onTopicChange: (topic: Topic) => void;
}

const TopicFilter: React.FC<TopicFilterProps> = ({currentTopic, onTopicChange}) => {
    return (
        <div className="mt-4 flex gap-3 overflow-x-auto">
            {TOPICS.map(({value, label}) => (
                <Button
                    key={value}
                    variant={currentTopic === value ? 'default' : 'secondary'}
                    onClick={() => onTopicChange(value)}
                >
                    {label}
                </Button>
            ))}
        </div>
    );
};

export default TopicFilter;
