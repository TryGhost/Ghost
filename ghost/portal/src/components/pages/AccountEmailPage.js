import AppContext from '../../AppContext';
import {useContext, useEffect, useState} from 'react';
import {isPaidMember} from '../../utils/helpers';
import NewsletterManagement from '../common/NewsletterManagement';

const React = require('react');

export default function AccountEmailPage() {
    const {member, onAction} = useContext(AppContext);
    const defaultSubscribedNewsletters = [...(member?.newsletters || [])];
    const [subscribedNewsletters, setSubscribedNewsletters] = useState(defaultSubscribedNewsletters);

    useEffect(() => {
        if (!member) {
            onAction('switchPage', {
                page: 'signin'
            });
        }
    }, [member, onAction]);

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
            unsubscribeAll={() => {
                setSubscribedNewsletters([]);
                onAction('showPopupNotification', {
                    action: 'updated:success',
                    message: `Newsletter preference updated.`
                });
                onAction('updateNewsletterPreference', {newsletters: []});
            }}
            isPaidMember={isPaidMember({member})}
        />
    );
}
