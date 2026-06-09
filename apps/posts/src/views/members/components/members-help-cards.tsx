import React from 'react';
import membersSubscribersImage from '../../../assets/members/members-2.jpg';
import {LucideIcon} from '@tryghost/shade/utils';

const MembersHelpCards: React.FC = () => {
    return (
        <div className="mx-auto w-full max-w-2xl px-4">
            <a
                className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-all hover:bg-accent/30 hover:shadow-sm sm:flex-row"
                href="https://ghost.org/resources/first-100-email-subscribers/"
                rel="noopener noreferrer"
                target="_blank"
            >
                <div
                    className="h-36 w-full shrink-0 bg-cover bg-center sm:h-auto sm:w-56"
                    style={{backgroundImage: `url(${membersSubscribersImage})`}}
                />
                <div className="flex grow flex-col justify-center p-5 sm:p-6">
                    <h4 className="text-sm font-semibold">
                        Get your first 100 email subscribers
                    </h4>
                    <p className="mt-1.5 text-sm leading-normal text-muted-foreground">
                        Starting from zero? Use this guide to find your founding audience members.
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-foreground">
                        Read the guide
                        <LucideIcon.ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                </div>
            </a>
        </div>
    );
};

export default MembersHelpCards;
