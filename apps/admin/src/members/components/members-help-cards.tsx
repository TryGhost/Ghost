import React from 'react';
import {LucideIcon, cn} from '@tryghost/shade/utils';

interface MembersHelpCardProps {
    children: React.ReactNode;
    description: string;
    title: string;
    url: string;
}

const MembersHelpCard: React.FC<MembersHelpCardProps> = ({children, description, title, url}) => {
    return (
        <a
            className="group/card block rounded-xl border bg-card p-6 transition-all hover:bg-table-row-hover hover:shadow-xs"
            href={url}
            rel="noopener noreferrer"
            target="_blank"
        >
            <div className="flex items-center gap-6">
                {children}
                <div className="flex flex-col leading-tight">
                    <h4 className="text-md font-medium tracking-normal text-pretty text-foreground">
                        {title}
                    </h4>
                    <p className="mt-1.5 text-sm leading-tight text-pretty text-muted-foreground">
                        {description}
                    </p>
                </div>
            </div>
        </a>
    );
};

const iconCardClass = 'flex h-18 w-[100px] min-w-[100px] items-center justify-center rounded-md p-4 opacity-80 transition-all group-hover/card:opacity-100';

const MembersHelpCards: React.FC = () => {
    return (
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
            <MembersHelpCard
                description="Learn how to turn anonymous visitors into logged-in members with memberships in Ghost."
                title="Building your audience with subscriber signups"
                url="https://ghost.org/resources/build-audience-subscriber-signups/"
            >
                <div className={cn(iconCardClass, 'bg-gradient-to-tr from-[#22C55E]/20 to-[#84CC16]/20')}>
                    <LucideIcon.UserPlus className="text-[#16A34A]" size={20} strokeWidth={1.5} />
                </div>
            </MembersHelpCard>

            <MembersHelpCard
                description="Starting from zero? Use this guide to find your founding audience members."
                title="Get your first 100 email subscribers"
                url="https://ghost.org/resources/first-100-email-subscribers/"
            >
                <div className={cn(iconCardClass, 'bg-gradient-to-tl from-[#A855F7]/20 to-[#EC4899]/20')}>
                    <LucideIcon.Mail className="text-[#DB2777]" size={20} strokeWidth={1.5} />
                </div>
            </MembersHelpCard>
        </div>
    );
};

export default MembersHelpCards;
