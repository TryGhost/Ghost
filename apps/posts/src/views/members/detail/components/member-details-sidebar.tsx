import React from 'react';
import moment from 'moment-timezone';
import {Avatar} from '@tryghost/shade/components';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import type {Member} from '@tryghost/admin-x-framework/api/members';

function formatLocation(geolocation: Member['geolocation']): string {
    if (!geolocation) {
        return 'Unknown location';
    }

    try {
        const parsed = JSON.parse(geolocation) as {
            country?: string;
            region?: string;
            country_code?: string;
        };

        if (parsed.country_code === 'US' && parsed.region) {
            return `${parsed.region}, US`;
        }

        return parsed.country || 'Unknown location';
    } catch {
        return 'Unknown location';
    }
}

function firstName(name: string): string {
    return name.split(' ')[0];
}

function MetaRow({icon: Icon, children}: {icon: React.ComponentType<{className?: string}>; children: React.ReactNode}) {
    return (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className="size-4 shrink-0" />
            <span className="min-w-0">{children}</span>
        </p>
    );
}

/**
 * Member identity, location/last-seen meta, signup info, attribution and
 * email engagement stats. Port of the Ember gh-member-details component.
 */
export function MemberDetailsSidebar({member, timezone, showEngagement, onEnableCommenting}: {
    member?: Member;
    timezone: string;
    showEngagement: boolean;
    onEnableCommenting: () => void;
}) {
    const isNew = !member;
    const displayName = member?.name || member?.email;

    const referrerSourceRaw = member?.attribution?.referrer_source;
    const referrerSource = referrerSourceRaw === 'Created manually' ? null : referrerSourceRaw;
    const attributionUrl = member?.attribution?.url;
    const attributionTitle = member?.attribution?.title;

    return (
        <aside className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                {displayName ? (
                    <Avatar
                        className="size-16 text-xl"
                        email={member?.email}
                        name={member?.name ?? member?.email ?? undefined}
                        src={member?.avatar_image}
                    />
                ) : (
                    <div className="flex size-16 items-center justify-center rounded-full bg-muted text-xl font-medium text-muted-foreground">
                        N
                    </div>
                )}
                <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold">
                        {displayName ?? (isNew ? 'New member' : '')}
                    </h3>
                    {member?.name && member?.email && (
                        <p className="truncate text-sm">
                            <a className="text-muted-foreground hover:text-foreground" href={`mailto:${member.email}`}>{member.email}</a>
                        </p>
                    )}
                </div>
            </div>

            {member && (
                <>
                    <div className="flex flex-col gap-2">
                        <MetaRow icon={LucideIcon.MapPin}>
                            {formatLocation(member.geolocation)}
                        </MetaRow>
                        <MetaRow icon={LucideIcon.Eye}>
                            {member.last_seen_at
                                ? <>Last seen on {moment.tz(member.last_seen_at, timezone).format('D MMM YYYY')}</>
                                : <span>Not seen yet</span>}
                        </MetaRow>
                        {member.can_comment === false && (
                            <MetaRow icon={LucideIcon.MessageSquareOff}>
                                <span>Comments disabled</span>
                                {' '}&mdash;{' '}
                                <button className="text-green underline-offset-2 hover:underline" type="button" onClick={onEnableCommenting}>
                                    Enable
                                </button>
                            </MetaRow>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <h4 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Signup info</h4>
                        <MetaRow icon={LucideIcon.UserPlus}>
                            Created&nbsp;&mdash;&nbsp;<span className="text-foreground">{moment.tz(member.created_at, timezone).format('D MMM YYYY')}</span>
                        </MetaRow>
                        {referrerSource && (
                            <MetaRow icon={LucideIcon.Globe}>
                                Source&nbsp;&mdash;&nbsp;<span className="text-foreground" title={referrerSource}>{referrerSource}</span>
                            </MetaRow>
                        )}
                        {attributionUrl && attributionTitle && (
                            <MetaRow icon={LucideIcon.FileText}>
                                Page&nbsp;&mdash;&nbsp;
                                <a className="text-foreground hover:underline" href={attributionUrl} rel="noopener noreferrer" target="_blank" title={attributionTitle}>
                                    {attributionTitle}
                                </a>
                            </MetaRow>
                        )}
                    </div>

                    {showEngagement && (
                        <div className="flex flex-col gap-2">
                            <h4 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Engagement</h4>
                            {(member.email_count ?? 0) === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    {member.name
                                        ? <>We&rsquo;ll show {firstName(member.name)}&rsquo;s email stats here once they receive their first newsletter.</>
                                        : <>We&rsquo;ll show this member&rsquo;s email stats here once they receive their first newsletter.</>}
                                </p>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Emails received</p>
                                        <div className="text-xl font-semibold">{formatNumber(member.email_count ?? 0)}</div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Emails opened</p>
                                        <div className="text-xl font-semibold">{formatNumber(member.email_opened_count ?? 0)}</div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Average open rate</p>
                                        {member.email_open_rate === null || member.email_open_rate === undefined ? (
                                            <div className="text-sm text-muted-foreground">
                                                This metric is calculated once a member has received 5 newsletters.
                                            </div>
                                        ) : (
                                            <div className="text-xl font-semibold">{member.email_open_rate}<span className="text-sm">%</span></div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </aside>
    );
}
