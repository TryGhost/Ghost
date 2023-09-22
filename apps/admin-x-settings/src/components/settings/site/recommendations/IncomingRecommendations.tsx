import IncomingRecommendationList from './IncomingRecommendationList';
import {useBrowseMentions} from '../../../../api/mentions';
import {useReferrerHistory} from '../../../../api/referrers';

const IncomingRecommendations: React.FC = () => {
    const {data: {mentions} = {}, pagination, isLoading} = useBrowseMentions({
        searchParams: {
            limit: '5',
            filter: `source:~$'/.well-known/recommendations.json'+verified:true`,
            order: 'created_at desc'
        }
    });

    // Also fetch sources
    const {data: {stats} = {}, isLoading: areSourcesLoading} = useReferrerHistory({});

    return (<IncomingRecommendationList isLoading={isLoading || areSourcesLoading} mentions={mentions ?? []} pagination={pagination} stats={stats ?? []}/>);
};

export default IncomingRecommendations;
