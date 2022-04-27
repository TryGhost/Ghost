import AppContext from '../../AppContext';
import CloseButton from '../common/CloseButton';
import BackButton from '../common/BackButton';
import {useContext, useState} from 'react';
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
    const [description, setDescription] = useState(newsletter?.description || '');
    const [timeoutId, setTimeoutId] = useState(null);
    let finalDescription = description;
    if (!description) {
        finalDescription = isChecked ? 'Subscribed' : 'Unsubscribed';
    }
    return (
        <section className='gh-portal-list-toggle-wrapper'>
            <div className='gh-portal-list-detail'>
                <h3>{newsletter.name}</h3>
                <p>{finalDescription}</p>
            </div>
            <div>
                <Switch id={newsletter.id} onToggle={(e, checked) => {
                    let updatedNewsletters = [];
                    if (!checked) {
                        updatedNewsletters = subscribedNewsletters.filter((d) => {
                            return d.id !== newsletter.id;
                        });
                        setDescription('Unsubscribed');
                        clearTimeout(timeoutId);
                        let newTimeoutId = setTimeout(() => {
                            setDescription(newsletter?.description);
                        }, 3000);
                        setTimeoutId(newTimeoutId);
                    } else {
                        updatedNewsletters = subscribedNewsletters.filter((d) => {
                            return d.id !== newsletter.id;
                        }).concat(newsletter);
                        setDescription('Subscribed');
                        clearTimeout(timeoutId);
                        let newTimeoutId = setTimeout(() => {
                            setDescription(newsletter?.description);
                        }, 3000);
                        setTimeoutId(newTimeoutId);
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

function ShowPaidMemberMessage({site, isPaid}) {
    if (isPaid) {
        return (
            <p style={{textAlign: 'center', marginTop: '12px', marginBottom: '0', color: 'var(--grey6)'}}>Unsubscribing from emails will not cancel your paid subscription to {site?.title}</p>
        );
    }
    return null;
}

export default function NewsletterManagement({
    subscribedNewsletters,
    updateSubscribedNewsletters,
    unsubscribeAll,
    isPaidMember
}) {
    const isDisabled = !subscribedNewsletters?.length;
    const {brandColor, site} = useContext(AppContext);
    return (
        <div className='gh-portal-content with-footer'>
            <CloseButton />
            <AccountHeader />
            <div className='gh-portal-section'>
                <div className='gh-portal-list'>
                    <NewsletterPrefs
                        subscribedNewsletters={subscribedNewsletters}
                        setSubscribedNewsletters={(updatedNewsletters) => {
                            let newsletters = updatedNewsletters.map((d) => {
                                return {
                                    id: d.id
                                };
                            });
                            updateSubscribedNewsletters(newsletters);
                        }}
                    />
                </div>
            </div>
            <footer className='gh-portal-action-footer'>
                <div style={{width: '100%'}}>
                    <ActionButton
                        isRunning={false}
                        onClick={(e) => {
                            unsubscribeAll();
                        }}
                        disabled={isDisabled}
                        brandColor={brandColor}
                        isPrimary={false}
                        label='Unsubscribe from all'
                        isDestructive={true}
                        style={{width: '100%'}}
                    />
                    <ShowPaidMemberMessage isPaid={isPaidMember} site={site} />
                </div>
            </footer>
        </div>
    );
}
