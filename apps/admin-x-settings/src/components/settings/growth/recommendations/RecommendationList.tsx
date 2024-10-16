import EditRecommendationModal from './EditRecommendationModal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import RecommendationIcon from './RecommendationIcon';
import useSettingGroup from '../../../../hooks/useSettingGroup';
import {Button, Link, NoValueLabel, PaginationData, ShowMoreData, Table, TableCell, TableRow, Tooltip} from '@tryghost/admin-x-design-system';
import {Recommendation} from '@tryghost/admin-x-framework/api/recommendations';
import {numberWithCommas} from '../../../../utils/helpers';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface RecommendationListProps {
    recommendations: Recommendation[],
    pagination?: PaginationData,
    showMore?: ShowMoreData,
    isLoading: boolean
}

const RecommendationItem: React.FC<{recommendation: Recommendation}> = ({recommendation}) => {
    const {route} = useRouting();

    // Navigate to the edit page, without changing the route
    // This helps to avoid fetching the recommendation
    const showDetails = () => {
        NiceModal.show(EditRecommendationModal, {
            pathName: route,
            animate: false,
            recommendation: recommendation
        });
    };

    const isGhostSite = recommendation.one_click_subscribe;
    const showSubscribers = isGhostSite && !!recommendation.count?.subscribers;
    const count = (showSubscribers ? recommendation.count?.subscribers : recommendation.count?.clicks) || 0;
    const newMembers = count === 1 ? 'signup' : 'signups';
    const clicks = count === 1 ? 'click' : 'clicks';

    return (
        <TableRow testId='recommendation-list-item'>
            <TableCell onClick={showDetails}>
                <div className='group flex items-center gap-3 hover:cursor-pointer'>
                    <div className={`flex grow flex-col`}>
                        <div className="mb-0.5 flex items-center gap-3">
                            <RecommendationIcon isGhostSite={isGhostSite} {...recommendation} />
                            <span className='line-clamp-1 font-medium'>{recommendation.title}</span>
                        </div>
                    </div>
                </div>
            </TableCell>
            <TableCell className='hidden w-[1%] whitespace-nowrap !pr-1 pl-0 text-right align-middle md:!visible md:!table-cell' padding={false} onClick={showDetails}>
                {(count === 0) ? (<span className="text-grey-500 dark:text-grey-900">-</span>) : (<div className='-mt-px items-end gap-1 text-right'>
                    <span className='text-right'>{numberWithCommas(count)}</span>
                </div>)}
            </TableCell>
            <TableCell className='hidden align-middle md:!visible md:!table-cell' onClick={showDetails}>
                {(count === 0) ? (null) : (<div className=''>
                    <span className='min-w-[60px] whitespace-nowrap text-left text-sm lowercase text-grey-700'>{showSubscribers ? newMembers : clicks}</span><span className='whitespace-nowrap text-left text-sm lowercase text-grey-700 opacity-0 transition-opacity group-hover/table-row:opacity-100'> from you</span>
                </div>)}
            </TableCell>
        </TableRow>
    );
};

const RecommendationList: React.FC<RecommendationListProps> = ({recommendations, pagination, showMore, isLoading}) => {
    const {
        siteData
    } = useSettingGroup();
    const recommendationsURL = `${siteData?.url.replace(/\/$/, '')}/#/portal/recommendations`;

    const {updateRoute} = useRouting();
    const openAddNewRecommendationModal = () => {
        updateRoute('recommendations/add');
    };

    const [copied, setCopied] = useState(false);

    const copyRecommendationsUrl = () => {
        navigator.clipboard.writeText(recommendationsURL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (isLoading || recommendations.length) {
        return <Table
            hint={<span className='flex items-center gap-1'>Shared with new members after signup, or anytime using <Link href={recommendationsURL} target='_blank'>this link</Link><Tooltip containerClassName='leading-none' content={copied ? 'Copied' : 'Copy link'} size='sm'><Button color='clear' hideLabel={true} icon={copied ? 'check-circle' : 'duplicate'} iconColorClass={copied ? 'text-green w-[14px] h-[14px]' : 'text-grey-600 hover:opacity-80 w-[14px] h-[14px]'} label={copied ? 'Copied' : 'Copy'} unstyled={true} onClick={copyRecommendationsUrl} /></Tooltip></span>}
            isLoading={isLoading}
            pagination={pagination}
            showMore={showMore}
            hintSeparator>
            {recommendations && recommendations.map(recommendation => <RecommendationItem key={recommendation.id} recommendation={recommendation} />)}
        </Table>;
    } else {
        return <NoValueLabel>
            <Button color='grey' label='Add first recommendation' size='sm' onClick={() => {
                openAddNewRecommendationModal();
            }}></Button>
            <span className='mt-2 max-w-[40ch] text-center text-xs'>Need inspiration? <Link href="https://ghost.org/explore" target='_blank'>Explore thousands of sites</Link></span>
        </NoValueLabel>;
    }
};

export default RecommendationList;
