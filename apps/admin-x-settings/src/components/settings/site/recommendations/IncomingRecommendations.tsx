import IncomingRecommendationList from './IncomingRecommendationList';
import {useBrowseMentions} from '../../../../api/mentions';

const IncomingRecommendations: React.FC = () => {
    const {data: {mentions} = {}, pagination, isLoading} = useBrowseMentions({
        searchParams: {
            limit: '5',
            filter: `source:~$'/.well-known/recommendations.json'+verified:true`,
            order: 'created_at desc'
        }
    });

    return (<IncomingRecommendationList isLoading={isLoading} mentions={mentions ?? []} pagination={pagination}/>);
};

export default IncomingRecommendations;
