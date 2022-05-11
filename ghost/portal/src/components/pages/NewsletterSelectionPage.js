import AppContext from '../../AppContext';
import {useContext, useState} from 'react';
import Switch from '../common/Switch';
import {getSiteNewsletters} from '../../utils/helpers';
import ActionButton from '../common/ActionButton';
import {ReactComponent as LockIcon} from '../../images/icons/lock.svg';

const React = require('react');

function NewsletterPrefSection({newsletter, subscribedNewsletters, setSubscribedNewsletters}) {
    const isChecked = subscribedNewsletters.some((d) => {
        return d.id === newsletter?.id;
    });
    if (newsletter.paid) {
        return (
            <section className='gh-portal-list-toggle-wrapper'>
                <div className='gh-portal-list-detail gh-portal-list-big'>
                    <h3>{newsletter.name}</h3>
                    <p>{newsletter.description}</p>
                </div>
                <div class="gh-portal-lock-icon-container">
                    <LockIcon className='gh-portal-lock-icon' alt='' title="Unlock access to all newsletters by becoming a paid subscriber." />
                </div>
            </section>
        );
    }
    return (
        <section className='gh-portal-list-toggle-wrapper'>
            <div className='gh-portal-list-detail gh-portal-list-big'>
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

export default function NewsletterSelectionPage({pageData}) {
    const {brandColor, site, onAction, action} = useContext(AppContext);
    const siteNewsletters = getSiteNewsletters({site});
    const defaultNewsletters = siteNewsletters.filter((d) => {
        return d.subscribe_on_signup;
    });
    // const tier = getProductFromPrice({site, priceId: pageData.plan});
    // const tierName = tier?.name;
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
        <div className='gh-portal-content with-footer gh-portal-newsletter-selection'>
            <p className="gh-portal-text-center gh-portal-text-large">Choose your newsletters</p>
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
                    <div style={{marginBottom: '20px'}}>
                        <ActionButton
                            isRunning={isRunning}
                            retry={retry}
                            disabled={disabled}
                            onClick={(e) => {
                                let newsletters = subscribedNewsletters.map((d) => {
                                    return {
                                        id: d.id
                                    };
                                });
                                const {name, email, plan, offerId} = pageData;
                                onAction('signup', {name, email, plan, newsletters, offerId});
                            }}
                            brandColor={brandColor}
                            label={label}
                            style={{width: '100%'}}
                        />
                    </div>
                    <div>
                        <button
                            className='gh-portal-btn gh-portal-btn-link gh-portal-btn-different-plan'
                            onClick = {() => {
                                if (this.props.onBack) {
                                    this.props.onBack();
                                } else {
                                    this.context.onAction('closePopup');
                                }
                            }}>
                            <span>Choose a different plan</span>
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
