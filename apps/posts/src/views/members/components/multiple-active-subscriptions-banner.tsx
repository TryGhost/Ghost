import {Banner} from '@tryghost/shade/components';
import {formatNumber} from '@tryghost/shade/utils';
import {useMultipleActiveSubscriptionsBanner} from '../hooks/use-multiple-active-subscriptions-banner';

interface MultipleActiveSubscriptionsBannerProps {
    count: number;
    hasResolvedCount: boolean;
    nql?: string;
    search: string;
}

const MultipleActiveSubscriptionsBanner = ({
    count,
    hasResolvedCount,
    nql,
    search
}: MultipleActiveSubscriptionsBannerProps) => {
    const banner = useMultipleActiveSubscriptionsBanner({
        count,
        hasResolvedCount,
        nql,
        search
    });

    if (!banner.shouldShow) {
        return null;
    }

    return (
        <Banner
            role="status"
            variant="warning"
            {...(banner.canDismiss ? {
                dismissible: true as const,
                onDismiss: banner.handleDismiss
            } : {
                dismissible: false as const
            })}
        >
            <div className="flex flex-col items-baseline gap-3 pr-8 sm:flex-row">
                We found {formatNumber(banner.count)} {banner.count === 1 ? 'member' : 'members'} with more than one active paid subscription.{' '}
                <div className="flex items-baseline gap-3">
                    {banner.canDismiss && (
                        <button className="nowrap font-semibold !underline" type="button" onClick={banner.handleViewMembers}>
                            View members
                        </button>
                    )}
                    <a className="nowrap font-semibold underline" href="https://ghost.org/help/duplicate-subscription-warning/" rel="noopener noreferrer" target="_blank">Learn more</a>
                </div>
            </div>
        </Banner>
    );
};

export default MultipleActiveSubscriptionsBanner;
