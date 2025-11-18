import ExploreByFollowing from './ExploreByFollowing';
import ExploreByTopic from './ExploreByTopic';
import React from 'react';
import {useFeatureFlags} from '@src/lib/feature-flags';

const Explore: React.FC = () => {
    const {isEnabled} = useFeatureFlags();
    const isTopicFilteringEnabled = isEnabled('explore-topic');

    if (isTopicFilteringEnabled) {
        return <ExploreByTopic />;
    }

    return <ExploreByFollowing />;
};

export default Explore;
