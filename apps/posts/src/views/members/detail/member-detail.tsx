import React from 'react';
import {LoadingIndicator} from '@tryghost/shade/components';
import {MemberDetailForm} from './member-detail-form';
import {Navigate, useLocation, useParams} from '@tryghost/admin-x-framework';
import {canManageMembers} from '@tryghost/admin-x-framework/api/users';
import {getMember} from '@tryghost/admin-x-framework/api/members';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';

function MemberNotFound() {
    return (
        <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">404</h1>
                <span aria-hidden="true">|</span>
                <h2 className="text-lg">Page not found</h2>
            </div>
        </div>
    );
}

function CenteredLoading() {
    return (
        <div className="flex h-full items-center justify-center">
            <LoadingIndicator size="lg" />
        </div>
    );
}

const MemberDetail: React.FC = () => {
    const params = useParams();
    const location = useLocation();
    // route as either /members/:memberId or /members/:member_id; /members/new
    // has no param at all when wired as its own path
    const memberId = params.memberId ?? params.member_id;
    const isNew = !memberId || memberId === 'new';

    const {data: currentUser, isLoading: isUserLoading} = useCurrentUser();
    const {data: settingsData, isLoading: isSettingsLoading} = useBrowseSettings();
    const {data: newslettersData, isLoading: isNewslettersLoading} = useBrowseNewsletters({
        searchParams: {filter: 'status:active', limit: 'all'}
    });

    const settings = settingsData?.settings ?? null;
    const paidMembersEnabled = getSettingValue<boolean>(settings, 'paid_members_enabled') === true;

    const {data: tiersData} = useBrowseTiers({
        searchParams: {filter: 'type:paid+active:true', include: 'monthly_price,yearly_price', limit: 'all'},
        enabled: paidMembersEnabled
    });

    const memberQuery = getMember(memberId ?? '', {
        searchParams: {include: 'tiers'},
        enabled: !isNew,
        defaultErrorHandler: false
    });

    if (isUserLoading || !currentUser) {
        return null;
    }

    // Authors, contributors and (non-super) editors cannot manage members
    // (mirrors the Ember members-management route guard)
    if (!canManageMembers(currentUser)) {
        return <Navigate to="/" replace />;
    }

    if (isSettingsLoading || !settings || isNewslettersLoading || (!isNew && memberQuery.isLoading)) {
        return <CenteredLoading />;
    }

    const member = memberQuery.data?.members?.[0];

    // Only show the 404 when there is no data at all - a failed background
    // refetch can leave stale data available, and unmounting the form in that
    // case would discard the user's in-progress edits.
    if (!isNew && !member) {
        return <MemberNotFound />;
    }

    const newsletters = newslettersData?.newsletters ?? [];
    const paidTiers = tiersData?.tiers ?? [];
    const canShowNewsletters = getSettingValue<string>(settings, 'editor_default_email_recipients') !== 'disabled';
    const showEngagement = getSettingValue<string>(settings, 'members_signup_access') !== 'none' && canShowNewsletters;
    const timezone = getSiteTimezone(settings);

    return (
        <MemberDetailForm
            key={member?.id ?? 'new'}
            canShowNewsletters={canShowNewsletters}
            initialSaveState={location.state?.justSaved ? 'saved' : 'idle'}
            member={isNew ? undefined : member}
            newsletters={newsletters}
            paidMembersEnabled={paidMembersEnabled}
            paidTiers={paidTiers}
            refetchMember={memberQuery.refetch}
            showEngagement={showEngagement}
            timezone={timezone}
        />
    );
};

export default MemberDetail;
