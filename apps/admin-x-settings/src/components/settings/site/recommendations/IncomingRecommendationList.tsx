import NoValueLabel from '../../../../admin-x-ds/global/NoValueLabel';
import React from 'react';
import Table from '../../../../admin-x-ds/global/Table';
import TableCell from '../../../../admin-x-ds/global/TableCell';
import TableRow from '../../../../admin-x-ds/global/TableRow';
import {Mention} from '../../../../api/mentions';

interface IncomingRecommendationListProps {
    mentions: Mention[]
}

const IncomingRecommendationItem: React.FC<{mention: Mention}> = ({mention}) => {
    const cleanedSource = mention.source.replace('/.well-known/recommendations.json', '');

    const showDetails = () => {
        // Open url
        window.open(cleanedSource, '_blank');
    };

    return (
        <TableRow hideActions>
            <TableCell onClick={showDetails}>
                <div className='group flex items-center gap-3 hover:cursor-pointer'>
                    <div className={`flex grow flex-col`}>
                        <div className="mb-1 flex items-center gap-2">
                            {mention.source_favicon && <img alt={mention.source_title || mention.source_site_title || cleanedSource} className="h-5 w-5 rounded-sm" src={mention.source_favicon} />}
                            <span className='line-clamp-1'>{mention.source_title || mention.source_site_title || cleanedSource}</span>
                        </div>
                        <span className='line-clamp-1 text-xs leading-snug text-grey-700'>{mention.source_excerpt || cleanedSource}</span>
                    </div>
                </div>
            </TableCell>
        </TableRow>
    );
};

const IncomingRecommendationList: React.FC<IncomingRecommendationListProps> = ({mentions}) => {
    if (mentions.length) {
        return <Table>
            {mentions.map(mention => <IncomingRecommendationItem key={mention.id} mention={mention} />)}
        </Table>;
    } else {
        return <NoValueLabel icon='thumbs-up'>
            No sites are recommending you yet.
        </NoValueLabel>;
    }
};

export default IncomingRecommendationList;
