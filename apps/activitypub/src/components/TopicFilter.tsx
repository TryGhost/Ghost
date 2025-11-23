import React, {useEffect, useRef, useState} from 'react';
import {Button} from '@tryghost/shade';

export type Topic = 'following' | 'top' | 'tech' | 'business' | 'news' | 'culture' | 'art' | 'travel' | 'education' | 'finance' | 'entertainment' | 'productivity' | 'literature' | 'personal' | 'programming' | 'design' | 'sport' | 'faith-spirituality' | 'science' | 'crypto' | 'food-drink' | 'music' | 'nature-outdoors' | 'climate' | 'history' | 'gear-gadgets';

const TOPICS: {value: Topic; label: string}[] = [
    {value: 'following', label: 'Following'},
    {value: 'top', label: 'Top'},
    {value: 'tech', label: 'Technology'},
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
    {value: 'climate', label: 'Climate'},
    {value: 'history', label: 'History'},
    {value: 'gear-gadgets', label: 'Gear & gadgets'}
];

interface TopicFilterProps {
    currentTopic: Topic;
    onTopicChange: (topic: Topic) => void;
    excludeTopics?: Topic[];
}

const TopicFilter: React.FC<TopicFilterProps> = ({currentTopic, onTopicChange, excludeTopics = []}) => {
    const filteredTopics = TOPICS.filter(({value}) => !excludeTopics.includes(value));
    const selectedButtonRef = useRef<HTMLButtonElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showGradient, setShowGradient] = useState(true);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const {scrollLeft, scrollWidth, clientWidth} = e.currentTarget;
        setShowGradient(scrollLeft + clientWidth < scrollWidth - 1);
    };

    useEffect(() => {
        if (selectedButtonRef.current) {
            selectedButtonRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [currentTopic]);

    return (
        <div className="relative w-full">
            <div
                ref={scrollContainerRef}
                className="flex w-full min-w-0 max-w-full snap-x snap-mandatory gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                onScroll={handleScroll}
            >
                {filteredTopics.map(({value, label}) => (
                    <Button
                        key={value}
                        ref={currentTopic === value ? selectedButtonRef : null}
                        className="h-8 snap-start rounded-full px-3.5 text-sm"
                        variant={currentTopic === value ? 'default' : 'secondary'}
                        onClick={() => onTopicChange(value)}
                    >
                        {label}
                    </Button>
                ))}
            </div>
            {showGradient && (
                <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-white to-transparent dark:from-black" />
            )}
        </div>
    );
};

export default TopicFilter;
