import React from 'react';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {isContributorUser} from '@tryghost/admin-x-framework/api/users';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {useFeaturebase} from '@tryghost/admin-x-framework';

const FORUM_URL = 'https://forum.ghost.org';
const HELP_URL = 'https://ghost.org/help/automations-beta';

interface HelpCardLayoutProps {
    title: string;
    description: string;
    children?: React.ReactNode;
}

const cardClass = 'block w-full rounded-xl border border-border bg-card p-6 text-left transition-all hover:shadow-xs hover:bg-accent/50 group/card';

const HelpCardBody: React.FC<HelpCardLayoutProps> = ({title, description, children}) => (
    <div className='flex items-center gap-6'>
        {children}
        <div className='flex flex-col gap-0.5 leading-tight'>
            <span className='text-base font-semibold'>{title}</span>
            <span className='text-sm font-normal text-gray-700'>{description}</span>
        </div>
    </div>
);

interface HelpLinkCardProps extends HelpCardLayoutProps {
    url: string;
    className?: string;
}

const HelpLinkCard: React.FC<HelpLinkCardProps> = ({url, className, title, description, children}) => (
    <a className={cn(cardClass, className)} href={url} rel='noreferrer' target='_blank'>
        <HelpCardBody description={description} title={title}>
            {children}
        </HelpCardBody>
    </a>
);

interface HelpButtonCardProps extends HelpCardLayoutProps {
    onClick: () => void;
    onMouseEnter?: () => void;
    onFocus?: () => void;
    className?: string;
}

const HelpButtonCard: React.FC<HelpButtonCardProps> = ({className, title, description, children, onClick, onMouseEnter, onFocus}) => (
    <button className={cn(cardClass, 'cursor-pointer appearance-none', className)} type='button' onClick={onClick} onFocus={onFocus} onMouseEnter={onMouseEnter}>
        <HelpCardBody description={description} title={title}>
            {children}
        </HelpCardBody>
    </button>
);

const AutomationsIconTile: React.FC = () => (
    <div className='flex h-18 w-[100px] min-w-[100px] items-center justify-center rounded-md bg-gradient-to-tr from-[#8B5CF6]/20 to-[#EC4899]/20 p-4 opacity-80 transition-all group-hover/card:opacity-100'>
        <LucideIcon.Zap className='text-[#8B5CF6]' size={20} strokeWidth={1.5} />
    </div>
);

const FeedbackIconTile: React.FC = () => (
    <div className='flex h-18 w-[100px] min-w-[100px] items-center justify-center rounded-md bg-gradient-to-tl from-[#10B981]/20 to-[#0EA5E9]/20 p-4 opacity-80 transition-all group-hover/card:opacity-100'>
        <LucideIcon.MessageCircle className='text-[#0EA5E9]' size={20} strokeWidth={1.5} />
    </div>
);

const FEEDBACK_TITLE = 'Share your feedback';
const FEEDBACK_DESCRIPTION = 'Tell us what’s working and what’s missing — your input shapes what we build next.';

const AutomationsHelpCards: React.FC = () => {
    const {data: currentUser} = useCurrentUser();
    const {isAvailable: featurebaseAvailable, openFeedbackWidget, preloadFeedbackWidget} = useFeaturebase();

    const canUseFeaturebase = featurebaseAvailable && currentUser && !isContributorUser(currentUser);

    return (
        <div className='mt-auto grid grid-cols-1 gap-6 pt-10 lg:grid-cols-2'>
            <HelpLinkCard
                description='Learn how to set up automations, customize your emails, and get the most out of the beta.'
                title='Automations in Ghost'
                url={HELP_URL}
            >
                <AutomationsIconTile />
            </HelpLinkCard>
            {canUseFeaturebase ? (
                <HelpButtonCard
                    description={FEEDBACK_DESCRIPTION}
                    title={FEEDBACK_TITLE}
                    onClick={() => openFeedbackWidget()}
                    onFocus={preloadFeedbackWidget}
                    onMouseEnter={preloadFeedbackWidget}
                >
                    <FeedbackIconTile />
                </HelpButtonCard>
            ) : (
                <HelpLinkCard
                    description={FEEDBACK_DESCRIPTION}
                    title={FEEDBACK_TITLE}
                    url={FORUM_URL}
                >
                    <FeedbackIconTile />
                </HelpLinkCard>
            )}
        </div>
    );
};

export default AutomationsHelpCards;
