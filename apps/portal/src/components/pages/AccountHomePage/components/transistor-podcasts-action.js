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

export const TRANSISTOR_DEFAULTS = {
    heading: 'Podcasts',
    description: 'Access private podcast feed',
    button_text: 'View',
    url_template: 'https://partner.transistor.fm/ghost/{memberUuid}'
};

const TransistorPodcastsAction = ({hasPodcasts, memberUuid, settings = {}}) => {
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberUuid);

    if (!hasPodcasts || !memberUuid || !isValidUuid) {
        return null;
    }

    // Translate if using a known default, otherwise display custom text as-is
    const maybeTranslate = (value, key) => {
        return value === TRANSISTOR_DEFAULTS[key] ? t(value) : value;
    };

    const heading = maybeTranslate(settings.heading, 'heading') || t(TRANSISTOR_DEFAULTS.heading);
    const description = maybeTranslate(settings.description, 'description') || t(TRANSISTOR_DEFAULTS.description);
    const buttonText = maybeTranslate(settings.button_text, 'button_text') || t(TRANSISTOR_DEFAULTS.button_text);
    const urlTemplate = settings.url_template || TRANSISTOR_DEFAULTS.url_template;
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
