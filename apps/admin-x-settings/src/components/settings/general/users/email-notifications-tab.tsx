import {SettingGroup, SettingGroupContent, Toggle} from '@tryghost/admin-x-design-system';
import {type User, hasAdminAccess} from '@tryghost/admin-x-framework/api/users';
import {checkStripeEnabled} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../../providers/global-data-provider';

const EmailNotificationsInputs: React.FC<{ user: User; setUserData: (user: User) => void; }> = ({user, setUserData}) => {
    const {config, settings} = useGlobalData();
    const hasStripeEnabled = checkStripeEnabled(settings || [], config || {});

    return (
        <SettingGroupContent>
            <Toggle
                checked={user.comment_notifications}
                direction='rtl'
                hint='Every time a member comments on one of your posts'
                label='Comments'
                onChange={(e) => {
                    setUserData?.({...user, comment_notifications: e.target.checked});
                }}
            />
            {hasAdminAccess(user) && <>
                <Toggle
                    checked={user.recommendation_notifications}
                    direction='rtl'
                    hint='Every time another publisher recommends you to their audience'
                    label='Recommendations'
                    onChange={(e) => {
                        setUserData?.({...user, recommendation_notifications: e.target.checked});
                    }}
                />
                <Toggle
                    checked={user.free_member_signup_notification}
                    direction='rtl'
                    hint='Every time a new free member signs up'
                    label='New signups'
                    onChange={(e) => {
                        setUserData?.({...user, free_member_signup_notification: e.target.checked});
                    }}
                />
                {hasStripeEnabled &&
                <>
                    <Toggle
                        checked={user.paid_subscription_started_notification}
                        direction='rtl'
                        hint='Every time a member starts a new paid subscription'
                        label='New paid members'
                        onChange={(e) => {
                            setUserData?.({...user, paid_subscription_started_notification: e.target.checked});
                        }}
                    />
                    <Toggle
                        checked={user.paid_subscription_canceled_notification}
                        direction='rtl'
                        hint='Every time a member cancels their paid subscription'
                        label='Paid member cancellations'
                        onChange={(e) => {
                            setUserData?.({...user, paid_subscription_canceled_notification: e.target.checked});
                        }}
                    />
                </>
                }
                <Toggle
                    checked={user.milestone_notifications}
                    direction='rtl'
                    hint={hasStripeEnabled ?
                        'Occasional summaries of your audience & revenue growth'
                        :
                        'Occasional summaries of your audience growth'
                    }
                    label='Milestones'
                    onChange={(e) => {
                        setUserData?.({...user, milestone_notifications: e.target.checked});
                    }}
                />
                {hasStripeEnabled && <Toggle
                    checked={user.donation_notifications}
                    direction='rtl'
                    hint='Every time you receive a one-time payment'
                    label='Tips & donations'
                    onChange={(e) => {
                        setUserData?.({...user, donation_notifications: e.target.checked});
                    }}
                />}
            </>}
        </SettingGroupContent>
    );
};

const EmailNotificationsTab: React.FC<{ user: User; setUserData: (user: User) => void; }> = ({user, setUserData}) => {
    return (
        <SettingGroup border={false}>
            <EmailNotificationsInputs setUserData={setUserData} user={user} />
        </SettingGroup>
    );
};

export default EmailNotificationsTab;
