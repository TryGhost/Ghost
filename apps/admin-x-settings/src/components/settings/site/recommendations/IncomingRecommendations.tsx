import IncomingRecommendationList from './IncomingRecommendationList';
import {useBrowseMentions} from '../../../../api/mentions';

const IncomingRecommendations: React.FC = () => {
    const {data: {mentions} = {}} = useBrowseMentions({
        searchParams: {
            filter: `source:~$'/.well-known/recommendations.json'+verified:true`,
            order: 'created_at desc'
        }
    });

    return (<IncomingRecommendationList mentions={mentions ?? []} />);
};

export default IncomingRecommendations;
