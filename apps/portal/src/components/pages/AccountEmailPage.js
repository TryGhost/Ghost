import AppContext from '../../AppContext';
import {useContext, useEffect, useState} from 'react';
import {isPaidMember, getSiteNewsletters, hasNewsletterSendingEnabled} from '../../utils/helpers';
import {SYNTAX_I18NEXT} from '@doist/react-interpolate';
import NewsletterManagement from '../common/NewsletterManagement';
import Interpolate from '@doist/react-interpolate';

export default function AccountEmailPage() {
    const {member, onAction, site, t, pageData} = useContext(AppContext);
    let newsletterUuid;
    let action;
    if (pageData) {
        newsletterUuid = pageData.newsletterUuid;
        action = pageData.action;
    }
    const [hasInteracted, setHasInteracted] = useState(true);
    const siteNewsletters = getSiteNewsletters({site});

    const hasNewslettersEnabled = hasNewsletterSendingEnabled({site});
    // Redirect to signin page if member is not available
    useEffect(() => {
        if (!member) {
            onAction('switchPage', {
                page: 'signin'
            });
        }
    }, [member, onAction]);

    // this results in an infinite loop, needs to run only once...
    useEffect(() => {
        // attempt auto-unsubscribe if we were redirected here from an unsubscribe link
        if (newsletterUuid && action === 'unsubscribe') {
            // Filter out the newsletter that matches the uuid
            const remainingNewsletterSubscriptions = member?.newsletters.filter(n => n.uuid !== newsletterUuid);
            setSubscribedNewsletters(remainingNewsletterSubscriptions);
            setHasInteracted(false); // this shows the dialog
            onAction('updateNewsletterPreference', {newsletters: remainingNewsletterSubscriptions});
        }
    }, []);

    const HeaderNotification = () => {
        if (pageData.comments && commentsEnabled) {
            const hideClassName = hasInteracted ? 'gh-portal-hide' : '';
            return (
                <>
                    <p className={`gh-portal-text-center gh-portal-header-message ${hideClassName}`}>
                        <Interpolate
                            syntax={SYNTAX_I18NEXT}
                            string={t('{{memberEmail}} will no longer receive emails when someone replies to your comments.')}
                            mapping={{
                                memberEmail: <strong>{member?.email}</strong>
                            }}
                        />
                    </p>
                </>
            );
        }
        const unsubscribedNewsletter = siteNewsletters?.find((d) => {
            return d.uuid === pageData.newsletterUuid;
        });
    
        if (!unsubscribedNewsletter) {
            return null;
        }
    
        const hideClassName = hasInteracted ? 'gh-portal-hide' : '';
        return (
            <>
                <p className={`gh-portal-text-center gh-portal-header-message ${hideClassName}`}>
                    <Interpolate
                        syntax={SYNTAX_I18NEXT}
                        string={t('{{memberEmail}} will no longer receive {{newsletterName}} newsletter.')}
                        mapping={{
                            memberEmail: <strong>{member?.email}</strong>,
                            newsletterName: <strong>{unsubscribedNewsletter?.name}</strong>
                        }}
                    />
                </p>
            </>
        );
    };

    const defaultSubscribedNewsletters = [...(member?.newsletters || [])];
    const [subscribedNewsletters, setSubscribedNewsletters] = useState(defaultSubscribedNewsletters);
    const {comments_enabled: commentsEnabled} = site;
    const {enable_comment_notifications: enableCommentNotifications} = member || {};

    useEffect(() => {
        setSubscribedNewsletters(member?.newsletters || []);
    }, [member?.newsletters]);

    return (
        <NewsletterManagement
            hasNewslettersEnabled={hasNewslettersEnabled}
            notification={newsletterUuid ? HeaderNotification : null}
            subscribedNewsletters={subscribedNewsletters}
            updateSubscribedNewsletters={(updatedNewsletters) => {
                setSubscribedNewsletters(updatedNewsletters);
                onAction('updateNewsletterPreference', {newsletters: updatedNewsletters});
                onAction('showPopupNotification', {
                    action: 'updated:success',
                    message: t('Email preferences updated.')
                });
            }}
            updateCommentNotifications={async (enabled) => {
                onAction('updateNewsletterPreference', {enableCommentNotifications: enabled});
            }}
            unsubscribeAll={() => {
                setSubscribedNewsletters([]);
                onAction('showPopupNotification', {
                    action: 'updated:success',
                    message: t(`Unsubscribed from all emails.`)
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
