import { t } from '../../../../utils/i18n';

export const TRANSISTOR_DEFAULTS = {
  heading: 'Podcasts',
  description: 'Access your RSS feeds',
  button_text: 'Manage',
  url_template: 'https://partner.transistor.fm/ghost/{memberUuid}',
};

const TransistorPodcastsAction = ({ hasPodcasts, memberUuid, settings = {} }) => {
  const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    memberUuid,
  );

  if (!hasPodcasts || !memberUuid || !isValidUuid) {
    return null;
  }

  // Translate default strings for i18n; custom admin-configured strings are displayed as-is
  const isDefault = (value, key) => !value || value === TRANSISTOR_DEFAULTS[key];
  const heading = isDefault(settings.heading, 'heading') ? t('Podcasts') : settings.heading;
  const description = isDefault(settings.description, 'description')
    ? t('Access your RSS feeds')
    : settings.description;
  const buttonText = isDefault(settings.button_text, 'button_text')
    ? t('Manage')
    : settings.button_text;
  const urlTemplate = settings.url_template || TRANSISTOR_DEFAULTS.url_template;
  const transistorUrl = urlTemplate.replace('{memberUuid}', memberUuid);

  return (
    <section className="gh-portal-action-transistor animate-fade-in-quick">
      <div className="gh-portal-list-detail grow [&_h3]:text-15 [&_h3]:font-semibold [&_p]:ms-0 [&_p]:me-2 [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:text-14.5 [&_p]:leading-[1.3em] [&_p]:tracking-[0.3px] [&_p]:[word-break:break-word] [&_p]:text-gray-700">
        <h3>{heading}</h3>
        <p>{description}</p>
      </div>
      <a
        href={transistorUrl}
        rel="noopener noreferrer"
        className="gh-portal-btn gh-portal-btn-list relative -mx-1 my-0 flex h-[38px] cursor-pointer items-center justify-center rounded-md border-none bg-white px-1 py-0 text-center text-15 leading-[1em] font-medium tracking-[0.2px] whitespace-nowrap text-brand no-underline outline-none select-none transition-control hover:border-gray-300 hover:opacity-75"
        target="_parent"
      >
        {buttonText}
      </a>
    </section>
  );
};

export default TransistorPodcastsAction;
