import AppContext from '../../AppContext';
import CloseButton from '../common/CloseButton';
import BackButton from '../common/BackButton';
import {useContext, useEffect, useState} from 'react';
import Switch from '../common/Switch';
import {getSiteNewsletters} from '../../utils/helpers';
import ActionButton from '../common/ActionButton';

const React = require('react');

function AccountHeader() {
    const {brandColor, lastPage, onAction} = useContext(AppContext);
    return (
        <header className='gh-portal-detail-header'>
            <BackButton brandColor={brandColor} hidden={!lastPage} onClick={(e) => {
                onAction('back');
            }} />
            <h3 className='gh-portal-main-title'>Email preferences</h3>
        </header>
    );
}

function NewsletterPrefSection({newsletter, subscribedNewsletters, setSubscribedNewsletters}) {
    const isChecked = subscribedNewsletters.some((d) => {
        return d.id === newsletter?.id;
    });
    return (
        <section className='gh-portal-list-toggle-wrapper'>
            <div className='gh-portal-list-detail'>
                <h3>{newsletter.name}</h3>
                <p>{newsletter.description}</p>
            </div>
            <div>
                <Switch id={newsletter.id} onToggle={(e, checked) => {
                    let updatedNewsletters = [];
                    if (!checked) {
                        updatedNewsletters = subscribedNewsletters.filter((d) => {
                            return d.id !== newsletter.id;
                        });
                    } else {
                        updatedNewsletters = subscribedNewsletters.filter((d) => {
                            return d.id !== newsletter.id;
                        }).concat(newsletter);
                    }
                    setSubscribedNewsletters(updatedNewsletters);
                }} checked={isChecked} />
            </div>
        </section>
    );
}

function NewsletterPrefs({subscribedNewsletters, setSubscribedNewsletters}) {
    const {site} = useContext(AppContext);
    const newsletters = getSiteNewsletters({site});
    return newsletters.map((newsletter) => {
        return (
            <NewsletterPrefSection
                key={newsletter?.id}
                newsletter={newsletter}
                subscribedNewsletters={subscribedNewsletters}
                setSubscribedNewsletters={setSubscribedNewsletters}
            />
        );
    });
}

export default function AccountEmailPage() {
    const {brandColor, member, onAction} = useContext(AppContext);
    const defaultSubscribedNewsletters = [...(member.newsletters || [])];
    const [subscribedNewsletters, setSubscribedNewsletters] = useState(defaultSubscribedNewsletters);
    useEffect(() => {
        setSubscribedNewsletters(member.newsletters);
    }, [member.newsletters]);

    return (
        <div className='gh-portal-content with-footer'>
            <CloseButton />
            <AccountHeader />
            <div className='gh-portal-section'>
                <div className='gh-portal-list'>
                    <NewsletterPrefs
                        subscribedNewsletters={subscribedNewsletters}
                        setSubscribedNewsletters={setSubscribedNewsletters}
                    />
                </div>
            </div>
            <footer className='gh-portal-action-footer'>
                <div style={{width: '100%'}}>
                    <div style={{marginBottom: '12px'}}>
                        <ActionButton
                            isRunning={false}
                            onClick={(e) => {
                                let newsletters = subscribedNewsletters.map((d) => {
                                    return {
                                        id: d.id
                                    };
                                });
                                onAction('showPopupNotification', {
                                    action: 'updated:success',
                                    message: `Newsletter preference updated.`
                                });
                                onAction('updateNewsletterPreference', {newsletters});
                            }}
                            disabled={false}
                            brandColor={brandColor}
                            label='Update'
                            style={{width: '100%'}}
                        />
                    </div>
                    <ActionButton
                        isRunning={false}
                        onClick={(e) => {
                            onAction('showPopupNotification', {
                                action: 'updated:success',
                                message: `Newsletter preference updated.`
                            });
                            onAction('updateNewsletterPreference', {newsletters: []});
                        }}
                        disabled={false}
                        brandColor={brandColor}
                        isPrimary={false}
                        label='Unsubscribe from all'
                        isDestructive={true}
                        style={{width: '100%'}}
                    />
                    <p style={{textAlign: 'center', marginTop: '12px', marginBottom: '0', color: 'var(--grey6)'}}>Unsubscribing from emails will not cancel your paid subscription to The Chinese Cinema</p>
                </div>
            </footer>
        </div>
    );
}
