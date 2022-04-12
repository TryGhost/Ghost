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
    return (
        <section>
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

export default function NewsletterSelectionPage() {
    const {brandColor, site, onAction, pageData, action} = useContext(AppContext);
    const siteNewsletters = getSiteNewsletters({site});
    const defaultNewsletters = siteNewsletters.filter((d) => {
        return d.subscribe_on_signup;
    });

    let isRunning = false;
    if (action === 'signup:running') {
        isRunning = true;
    }
    let label = 'Continue';
    let retry = false;
    if (action === 'signup:failed') {
        label = 'Retry';
        retry = true;
    }

    const disabled = (action === 'signup:running') ? true : false;

    const [subscribedNewsletters, setSubscribedNewsletters] = useState(defaultNewsletters);
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
                            isRunning={isRunning}
                            retry={retry}
                            disabled={disabled}
                            onClick={(e) => {
                                /* eslint-disable no-console */
                                console.log(pageData);
                                console.log(subscribedNewsletters);
                                /* eslint-enable no-console */
                                let newsletters = subscribedNewsletters.map((d) => {
                                    return {
                                        id: d.id
                                    };
                                });
                                const {name, email, plan} = pageData;
                                onAction('signup', {name, email, plan, newsletters});
                            }}
                            brandColor={brandColor}
                            label={label}
                            style={{width: '100%'}}
                        />
                    </div>
                </div>
            </footer>
        </div>
    );
}
