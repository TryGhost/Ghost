import React, {useEffect, useRef, useState} from 'react';
import {Button} from '@tryghost/shade';
import {useTopicsForUser} from '@src/hooks/use-activity-pub-queries';

export type Topic = string;

interface TopicFilterProps {
    currentTopic: Topic;
    onTopicChange: (topic: Topic) => void;
    excludeTopics?: Topic[];
}

const TopicFilter: React.FC<TopicFilterProps> = ({currentTopic, onTopicChange, excludeTopics = []}) => {
    const {topicsQuery} = useTopicsForUser();
    const {data: topicsData} = topicsQuery;

    // Always include "Following" topic at the beginning, then merge with API topics
    const followingTopic = {slug: 'following', name: 'Following'};
    const apiTopics = topicsData?.topics || [];
    const allTopics = [followingTopic, ...apiTopics];

    const filteredTopics = allTopics.filter(({slug}) => !excludeTopics.includes(slug));
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
                {filteredTopics.map(({slug, name}) => (
                    <Button
                        key={slug}
                        ref={currentTopic === slug ? selectedButtonRef : null}
                        className="h-8 snap-start rounded-full px-3.5 text-sm"
                        variant={currentTopic === slug ? 'default' : 'secondary'}
                        onClick={() => onTopicChange(slug)}
                    >
                        {name}
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
