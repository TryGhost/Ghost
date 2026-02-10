import {t} from '../../../../utils/i18n';

export const TransistorPodcastsActionStyles = `
    .gh-portal-action-transistor {
        animation: fadeIn 0.3s ease-in-out;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
`;

const TransistorPodcastsAction = ({hasPodcasts, memberUuid}) => {
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberUuid);

    if (!hasPodcasts || !memberUuid || !isValidUuid) {
        return null;
    }

    const transistorUrl = `https://partner.transistor.fm/ghost/${memberUuid}`;

    return (
        <section className='gh-portal-action-transistor'>
            <div className='gh-portal-list-detail'>
                <h3>{t('Podcasts')}</h3>
            </div>
            <a
                href={transistorUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='gh-portal-btn gh-portal-btn-list'
            >
                {t('Subscribe')}
            </a>
        </section>
    );
};

export default TransistorPodcastsAction;
