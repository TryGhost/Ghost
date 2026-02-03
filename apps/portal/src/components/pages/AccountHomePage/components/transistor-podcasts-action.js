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

const TransistorPodcastsAction = ({hasPodcasts, memberUuid, heading, description, buttonText}) => {
    if (!hasPodcasts || !memberUuid) {
        return null;
    }

    const transistorUrl = `https://partner.transistor.fm/ghost/${memberUuid}`;

    return (
        <section className="gh-portal-action-transistor">
            <div className='gh-portal-list-detail'>
                <h3>{heading || t('Podcasts')}</h3>
                {description && <p>{description}</p>}
            </div>
            <a
                href={transistorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className='gh-portal-btn gh-portal-btn-list'
            >
                {buttonText || t('Subscribe')}
            </a>
        </section>
    );
};

export default TransistorPodcastsAction;
