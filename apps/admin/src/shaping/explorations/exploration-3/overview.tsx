import React from 'react';
import RecentPosts from './recent-posts';
import { OverviewExploration } from '@/shaping/explorations/exploration-1/overview';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Exploration 3's Overview: Exploration 1's, with Recent posts (recent-posts.tsx)
// in place of the latest post and Top posts.

const OverviewExploration3: React.FC = () => <OverviewExploration postsSection={<RecentPosts />} />;

export default OverviewExploration3;
