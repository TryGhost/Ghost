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
    description: 'Access your RSS feeds',
    button_text: 'Manage',
    url_template: 'https://partner.transistor.fm/ghost/{memberUuid}'
};

const TransistorPodcastsAction = ({hasPodcasts, memberUuid, settings = {}}) => {
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberUuid);

    if (!hasPodcasts || !memberUuid || !isValidUuid) {
        return null;
    }

    // Translate default strings for i18n; custom admin-configured strings are displayed as-is
    const isDefault = (value, key) => !value || value === TRANSISTOR_DEFAULTS[key];
    const heading = isDefault(settings.heading, 'heading') ? t('Podcasts') : settings.heading;
    const description = isDefault(settings.description, 'description') ? t('Access your RSS feeds') : settings.description;
    const buttonText = isDefault(settings.button_text, 'button_text') ? t('Manage') : settings.button_text;
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
                rel='noopener noreferrer'
                className='gh-portal-btn gh-portal-btn-list'
                target="_parent"
            >
                {buttonText}
            </a>
        </section>
    );
};

export default TransistorPodcastsAction;
