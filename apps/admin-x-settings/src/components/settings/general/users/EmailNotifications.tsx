import CustomHeader from './CustomHeader';
import useFeatureFlag from '../../../../hooks/useFeatureFlag';
import {SettingGroup, SettingGroupContent, Toggle} from '@tryghost/admin-x-design-system';
import {User, hasAdminAccess} from '@tryghost/admin-x-framework/api/users';

const EmailNotificationsInputs: React.FC<{ user: User; setUserData: (user: User) => void; }> = ({user, setUserData}) => {
    const hasWebmentions = useFeatureFlag('webmentions');

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
                {hasWebmentions && <Toggle
                    checked={user.mention_notifications}
                    direction='rtl'
                    hint='Every time another site links to your work'
                    label='Mentions'
                    onChange={(e) => {
                        setUserData?.({...user, mention_notifications: e.target.checked});
                    }}
                />}
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
                <Toggle
                    checked={user.milestone_notifications}
                    direction='rtl'
                    hint='Occasional summaries of your audience & revenue growth'
                    label='Milestones'
                    onChange={(e) => {
                        setUserData?.({...user, milestone_notifications: e.target.checked});
                    }}
                />
            </>}
        </SettingGroupContent>
    );
};

const EmailNotifications: React.FC<{ user: User; setUserData: (user: User) => void; }> = ({user, setUserData}) => {
    return (
        <SettingGroup
            border={false}
            customHeader={<CustomHeader>Email notifications</CustomHeader>}
            title='Email notifications'

        >
            <EmailNotificationsInputs setUserData={setUserData} user={user} />
        </SettingGroup>
    );
};

export default EmailNotifications;
