import React from 'react';
import {LucideIcon} from '@tryghost/shade/utils';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';

const MembersHelpCards: React.FC = () => {
    const {assetRoot} = getGhostPaths();

    return (
        <div className="mx-auto grid w-full max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
            <a
                className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:shadow-sm"
                href="https://ghost.org/resources/build-audience-subscriber-signups/"
                rel="noopener noreferrer"
                target="_blank"
            >
                <div
                    className="h-36 w-full bg-cover bg-center"
                    style={{backgroundImage: `url(${assetRoot}img/marketing/members-1.jpg)`}}
                />
                <div className="flex grow flex-col p-5">
                    <h4 className="text-sm font-semibold">
                        Building your audience with subscriber signups
                    </h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        Learn how to turn anonymous visitors into logged-in members with memberships in Ghost.
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-foreground">
                        Start building
                        <LucideIcon.ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                </div>
            </a>

            <a
                className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:shadow-sm"
                href="https://ghost.org/resources/first-100-email-subscribers/"
                rel="noopener noreferrer"
                target="_blank"
            >
                <div
                    className="h-36 w-full bg-cover bg-center"
                    style={{backgroundImage: `url(${assetRoot}img/marketing/members-2.jpg)`}}
                />
                <div className="flex grow flex-col p-5">
                    <h4 className="text-sm font-semibold">
                        Get your first 100 email subscribers
                    </h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        Starting from zero? Use this guide to find your founding audience members.
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-foreground">
                        Become an expert
                        <LucideIcon.ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                </div>
            </a>
        </div>
    );
};

export default MembersHelpCards;
