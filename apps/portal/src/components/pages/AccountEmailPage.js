import AppContext from '../../AppContext';
import React, {useContext, useEffect, useState} from 'react';
import {isPaidMember} from '../../utils/helpers';
import NewsletterManagement from '../common/NewsletterManagement';

export default function AccountEmailPage() {
    const {member, onAction, site, t} = useContext(AppContext);

    useEffect(() => {
        if (!member) {
            onAction('switchPage', {
                page: 'signin'
            });
        }
    }, [member, onAction]);

    const defaultSubscribedNewsletters = [...(member?.newsletters || [])];
    const [subscribedNewsletters, setSubscribedNewsletters] = useState(defaultSubscribedNewsletters);
    const {comments_enabled: commentsEnabled} = site;
    const {enable_comment_notifications: enableCommentNotifications} = member || {};

    useEffect(() => {
        setSubscribedNewsletters(member?.newsletters || []);
    }, [member?.newsletters]);

    return (
        <NewsletterManagement
            notification={null}
            subscribedNewsletters={subscribedNewsletters}
            updateSubscribedNewsletters={(updatedNewsletters) => {
                setSubscribedNewsletters(updatedNewsletters);
                onAction('updateNewsletterPreference', {newsletters: updatedNewsletters});
            }}
            updateCommentNotifications={async (enabled) => {
                onAction('updateNewsletterPreference', {enableCommentNotifications: enabled});
            }}
            unsubscribeAll={() => {
                setSubscribedNewsletters([]);
                onAction('showPopupNotification', {
                    action: 'updated:success',
                    message: t(`Email preference updated.`)
                });
                const data = {newsletters: []};
                if (commentsEnabled) {
                    data.enableCommentNotifications = false;
                }
                onAction('updateNewsletterPreference', data);
            }}
            isPaidMember={isPaidMember({member})}
            isCommentsEnabled={commentsEnabled !== 'off'}
            enableCommentNotifications={enableCommentNotifications}
        />
    );
}
