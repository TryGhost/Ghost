import {Field, FieldContent, FieldDescription, FieldLabel, Switch} from '@tryghost/shade/components';
import {SettingGroup, SettingGroupContent} from '@tryghost/shade/patterns';
import {type User, hasAdminAccess} from '@tryghost/admin-x-framework/api/users';
import {checkStripeEnabled} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../../providers/global-data-provider';

const EmailNotificationsInputs: React.FC<{ user: User; setUserData: (user: User) => void; }> = ({user, setUserData}) => {
    const {config, settings} = useGlobalData();
    const hasStripeEnabled = checkStripeEnabled(settings || [], config || {});

    return (
        <SettingGroupContent>
            <div>
                <span className='text-sm font-medium tracking-wide text-grey-700 uppercase'>Engagement</span>
                <div className='mt-3 flex flex-col gap-4'>
                    <Field orientation='horizontal'>
                        <FieldContent>
                            <FieldLabel htmlFor='comment-notifications'>Comments</FieldLabel>
                            <FieldDescription>Every time a member comments on one of your posts</FieldDescription>
                        </FieldContent>
                        <Switch checked={Boolean(user.comment_notifications)} id='comment-notifications' onCheckedChange={checked => setUserData({...user, comment_notifications: checked})} />
                    </Field>
                    {hasAdminAccess(user) &&
                        <Field orientation='horizontal'>
                            <FieldContent>
                                <FieldLabel htmlFor='recommendation-notifications'>Recommendations</FieldLabel>
                                <FieldDescription>Every time another publisher recommends you to their audience</FieldDescription>
                            </FieldContent>
                            <Switch checked={Boolean(user.recommendation_notifications)} id='recommendation-notifications' onCheckedChange={checked => setUserData({...user, recommendation_notifications: checked})} />
                        </Field>
                    }
                </div>
            </div>
            {hasAdminAccess(user) && <>
                <div>
                    <span className='text-sm font-medium tracking-wide text-grey-700 uppercase'>Members</span>
                    <div className='mt-3 flex flex-col gap-4'>
                        <Field orientation='horizontal'>
                            <FieldContent>
                                <FieldLabel htmlFor='free-member-signup-notifications'>New signups</FieldLabel>
                                <FieldDescription>Every time a new free member signs up</FieldDescription>
                            </FieldContent>
                            <Switch checked={Boolean(user.free_member_signup_notification)} id='free-member-signup-notifications' onCheckedChange={checked => setUserData({...user, free_member_signup_notification: checked})} />
                        </Field>
                        {hasStripeEnabled && <>
                            <Field orientation='horizontal'>
                                <FieldContent>
                                    <FieldLabel htmlFor='paid-subscription-started-notifications'>New paid members</FieldLabel>
                                    <FieldDescription>Every time a member starts a new paid subscription</FieldDescription>
                                </FieldContent>
                                <Switch checked={Boolean(user.paid_subscription_started_notification)} id='paid-subscription-started-notifications' onCheckedChange={checked => setUserData({...user, paid_subscription_started_notification: checked})} />
                            </Field>
                            <Field orientation='horizontal'>
                                <FieldContent>
                                    <FieldLabel htmlFor='paid-subscription-canceled-notifications'>Paid member cancellations</FieldLabel>
                                    <FieldDescription>Every time a member cancels their paid subscription</FieldDescription>
                                </FieldContent>
                                <Switch checked={Boolean(user.paid_subscription_canceled_notification)} id='paid-subscription-canceled-notifications' onCheckedChange={checked => setUserData({...user, paid_subscription_canceled_notification: checked})} />
                            </Field>
                        </>}
                    </div>
                </div>
                <div>
                    <span className='text-sm font-medium tracking-wide text-grey-700 uppercase'>Revenue</span>
                    <div className='mt-3 flex flex-col gap-4'>
                        <Field orientation='horizontal'>
                            <FieldContent>
                                <FieldLabel htmlFor='milestone-notifications'>Milestones</FieldLabel>
                                <FieldDescription>{hasStripeEnabled ? 'Occasional summaries of your audience & revenue growth' : 'Occasional summaries of your audience growth'}</FieldDescription>
                            </FieldContent>
                            <Switch checked={Boolean(user.milestone_notifications)} id='milestone-notifications' onCheckedChange={checked => setUserData({...user, milestone_notifications: checked})} />
                        </Field>
                        {hasStripeEnabled && <Field orientation='horizontal'>
                            <FieldContent>
                                <FieldLabel htmlFor='donation-notifications'>Tips & donations</FieldLabel>
                                <FieldDescription>Every time you receive a one-time payment</FieldDescription>
                            </FieldContent>
                            <Switch checked={Boolean(user.donation_notifications)} id='donation-notifications' onCheckedChange={checked => setUserData({...user, donation_notifications: checked})} />
                        </Field>}
                        {hasStripeEnabled && <Field orientation='horizontal'>
                            <FieldContent>
                                <FieldLabel htmlFor='gift-subscription-notifications'>Gift subscriptions</FieldLabel>
                                <FieldDescription>Every time someone purchases or redeems a gift subscription</FieldDescription>
                            </FieldContent>
                            <Switch checked={Boolean(user.gift_subscription_notifications)} id='gift-subscription-notifications' onCheckedChange={checked => setUserData({...user, gift_subscription_notifications: checked})} />
                        </Field>}
                    </div>
                </div>
            </>}
        </SettingGroupContent>
    );
};

const EmailNotificationsTab: React.FC<{ user: User; setUserData: (user: User) => void; }> = ({user, setUserData}) => {
    return (
        <SettingGroup variant='plain'>
            <EmailNotificationsInputs setUserData={setUserData} user={user} />
        </SettingGroup>
    );
};

export default EmailNotificationsTab;
