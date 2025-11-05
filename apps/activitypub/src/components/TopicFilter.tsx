import React from 'react';
import {Button} from '@tryghost/shade';

export type Topic = 'following' | 'technology' | 'business' | 'news' | 'culture' | 'art' | 'travel' | 'education' | 'finance' | 'entertainment' | 'productivity' | 'literature' | 'personal' | 'programming' | 'design' | 'sport' | 'faith' | 'science' | 'crypto' | 'food' | 'music' | 'nature' | 'fashion' | 'climate' | 'fiction' | 'history' | 'parenting' | 'gear' | 'house';

const TOPICS: {value: Topic; label: string}[] = [
    {value: 'following', label: 'Following'},
    {value: 'technology', label: 'Technology'},
    {value: 'business', label: 'Business'},
    {value: 'news', label: 'News'},
    {value: 'culture', label: 'Culture'},
    {value: 'art', label: 'Art'},
    {value: 'travel', label: 'Travel'},
    {value: 'education', label: 'Education'},
    {value: 'finance', label: 'Finance'},
    {value: 'entertainment', label: 'Entertainment'},
    {value: 'productivity', label: 'Productivity'},
    {value: 'literature', label: 'Literature'},
    {value: 'personal', label: 'Personal'},
    {value: 'programming', label: 'Programming'},
    {value: 'design', label: 'Design'},
    {value: 'sport', label: 'Sport & fitness'},
    {value: 'faith', label: 'Faith & spirituality'},
    {value: 'science', label: 'Science'},
    {value: 'crypto', label: 'Crypto'},
    {value: 'food', label: 'Food & drink'},
    {value: 'music', label: 'Music'},
    {value: 'nature', label: 'Nature & outdoors'},
    {value: 'fashion', label: 'Fashion & beauty'},
    {value: 'climate', label: 'Climate'},
    {value: 'fiction', label: 'Fiction'},
    {value: 'history', label: 'History'},
    {value: 'parenting', label: 'Parenting'},
    {value: 'gear', label: 'Gear & gadgets'},
    {value: 'house', label: 'House & home'}
];

interface TopicFilterProps {
    currentTopic: Topic;
    onTopicChange: (topic: Topic) => void;
}

const TopicFilter: React.FC<TopicFilterProps> = ({currentTopic, onTopicChange}) => {
    return (
        <div className="mt-4">
            <div
                className="flex w-full min-w-0 max-w-full snap-x snap-mandatory gap-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {TOPICS.map(({value, label}) => (
                    <Button
                        key={value}
                        className="snap-start"
                        variant={currentTopic === value ? 'default' : 'secondary'}
                        onClick={() => onTopicChange(value)}
                    >
                        {label}
                    </Button>
                ))}
            </div>
        </div>
    );
};

export default TopicFilter;
