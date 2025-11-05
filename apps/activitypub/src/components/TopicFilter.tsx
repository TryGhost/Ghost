import React from 'react';
import {Button} from '@tryghost/shade';

export type Topic = 'following' | 'technology' | 'business' | 'news' | 'culture' | 'art' | 'travel' | 'education' | 'finance' | 'entertainment' | 'productivity' | 'literature' | 'personal' | 'programming' | 'design' | 'sport' | 'faith-spirituality' | 'science' | 'crypto' | 'food-drink' | 'music' | 'nature-outdoors' | 'fashion-beauty' | 'climate' | 'fiction' | 'history' | 'parenting' | 'gear-gadgets' | 'house-home';

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
    {value: 'faith-spirituality', label: 'Faith & spirituality'},
    {value: 'science', label: 'Science'},
    {value: 'crypto', label: 'Crypto'},
    {value: 'food-drink', label: 'Food & drink'},
    {value: 'music', label: 'Music'},
    {value: 'nature-outdoors', label: 'Nature & outdoors'},
    {value: 'fashion-beauty', label: 'Fashion & beauty'},
    {value: 'climate', label: 'Climate'},
    {value: 'fiction', label: 'Fiction'},
    {value: 'history', label: 'History'},
    {value: 'parenting', label: 'Parenting'},
    {value: 'gear-gadgets', label: 'Gear & gadgets'},
    {value: 'house-home', label: 'House & home'}
];

interface TopicFilterProps {
    currentTopic: Topic;
    onTopicChange: (topic: Topic) => void;
}

const TopicFilter: React.FC<TopicFilterProps> = ({currentTopic, onTopicChange}) => {
    return (
        <div className="relative w-full">
            <div
                className="flex w-full min-w-0 max-w-full snap-x snap-mandatory gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {TOPICS.map(({value, label}) => (
                    <Button
                        key={value}
                        className="h-8 snap-start rounded-full px-3.5 text-sm"
                        variant={currentTopic === value ? 'default' : 'secondary'}
                        onClick={() => onTopicChange(value)}
                    >
                        {label}
                    </Button>
                ))}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-white to-transparent dark:from-black" />
        </div>
    );
};

export default TopicFilter;
