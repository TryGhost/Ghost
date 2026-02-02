import AppContext from '../../../../app-context';
import {useContext, useEffect, useState} from 'react';
import {t} from '../../../../utils/i18n';

const TransistorPodcastsAction = () => {
    const {member, site} = useContext(AppContext);
    const [hasPodcasts, setHasPodcasts] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const isTransistorEnabled = Boolean(site.labs?.transistor);
    // TODO: Remove hardcoded UUID after testing
    const memberUuid = '0897917f-5ef0-4caa-a44b-2f748c8e80da'; // member?.uuid;

    useEffect(() => {
        if (!isTransistorEnabled || !memberUuid) {
            setIsLoading(false);
            return;
        }

        const checkTransistorMembership = async () => {
            try {
                const response = await fetch(`https://partner.transistor.fm/ghost/member/${memberUuid}`);
                if (response.ok) {
                    const data = await response.json();
                    setHasPodcasts(data.member === true);
                }
            } catch (e) {
                // Silently fail - don't show the button if we can't reach Transistor
            } finally {
                setIsLoading(false);
            }
        };

        checkTransistorMembership();
    }, [isTransistorEnabled, memberUuid]);

    if (!isTransistorEnabled || isLoading || !hasPodcasts) {
        return null;
    }

    const transistorUrl = `https://partner.transistor.fm/ghost/${memberUuid}`;

    return (
        <section>
            <div className='gh-portal-list-detail'>
                <h3>{t('Podcasts')}</h3>
            </div>
            <a
                href={transistorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className='gh-portal-btn gh-portal-btn-list'
            >
                {t('Subscribe')}
            </a>
        </section>
    );
};

export default TransistorPodcastsAction;
