import AppContext from '../../AppContext';
import CloseButton from '../common/CloseButton';
import BackButton from '../common/BackButton';
import {useContext} from 'react';
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

function NewsletterPrefSection({newsletter}) {
    return (
        <section>
            <div className='gh-portal-list-detail'>
                <h3>{newsletter.name}</h3>
            </div>
            <div>
                <Switch id={newsletter.id} onToggle={(e) => {
                    // handle newsletter pref toggle
                }} checked={false} />
            </div>
        </section>
    );
}

function NewsletterPrefs() {
    const {site} = useContext(AppContext);
    const newsletters = getSiteNewsletters({site});
    return newsletters.map((newsletter) => {
        return (
            <>
                <NewsletterPrefSection key={newsletter?.id} newsletter={newsletter} />
            </>
        );
    });
}

export default function AccountEmailPage() {
    const {brandColor} = useContext(AppContext);
    return (
        <div className='gh-portal-content with-footer'>
            <CloseButton />
            <AccountHeader />
            <div className='gh-portal-section'>
                <div className='gh-portal-list'>
                    <NewsletterPrefs />
                </div>
            </div>
            <footer className='gh-portal-action-footer'>
                <div style={{width: '100%'}}>
                    <div style={{marginBottom: '12px'}}>
                        <ActionButton
                            isRunning={false}
                            onClick={(e) => {}}
                            disabled={false}
                            brandColor={brandColor}
                            label='Update'
                            style={{width: '100%'}}
                        />
                    </div>
                    <ActionButton
                        isRunning={false}
                        onClick={(e) => {}}
                        disabled={false}
                        brandColor={brandColor}
                        isPrimary={false}
                        label='Unsubscribe from all'
                        isDestructive={true}
                        style={{width: '100%'}}
                    />
                </div>
            </footer>
        </div>
    );
}
