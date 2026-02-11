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

    .gh-portal-action-transistor .gh-portal-list-detail p {
        word-break: break-word;
    }
`;

const DEFAULT_HEADING = 'Podcasts';
const DEFAULT_DESCRIPTION = 'Access your RSS feeds';
const DEFAULT_BUTTON_TEXT = 'Manage';
const DEFAULT_URL_TEMPLATE = 'https://partner.transistor.fm/ghost/{memberUuid}';

const TransistorPodcastsAction = ({hasPodcasts, memberUuid, settings = {}}) => {
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberUuid);

    if (!hasPodcasts || !memberUuid || !isValidUuid) {
        return null;
    }

    const hasCustomHeading = settings.heading && settings.heading !== DEFAULT_HEADING;
    const hasCustomDescription = settings.description && settings.description !== DEFAULT_DESCRIPTION;
    const hasCustomButtonText = settings.button_text && settings.button_text !== DEFAULT_BUTTON_TEXT;

    const heading = hasCustomHeading ? settings.heading : t(DEFAULT_HEADING);
    const description = hasCustomDescription ? settings.description : t(DEFAULT_DESCRIPTION);
    const buttonText = hasCustomButtonText ? settings.button_text : t(DEFAULT_BUTTON_TEXT);
    const urlTemplate = settings.url_template || DEFAULT_URL_TEMPLATE;

    const transistorUrl = urlTemplate.replace('{memberUuid}', memberUuid);

    return (
        <section className='gh-portal-action-transistor'>
            <div className='gh-portal-list-detail'>
                <h3>{heading}</h3>
                <p>{description}</p>
            </div>
            <a
                href={transistorUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='gh-portal-btn gh-portal-btn-list'
            >
                {buttonText}
            </a>
        </section>
    );
};

export default TransistorPodcastsAction;
