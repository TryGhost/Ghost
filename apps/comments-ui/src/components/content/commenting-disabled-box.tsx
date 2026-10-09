import { interpolate } from '../../utils/interpolate';
import { useAppContext } from '../../app-context';
import type { FunctionComponent } from 'preact';

const CommentingDisabledBox: FunctionComponent = () => {
  const { accentColor, supportEmail, t } = useAppContext();

  const linkStyle = {
    color: accentColor,
  };

  return (
    <>
      <h1 className="mb-2 text-center font-sans text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white/85">
        {t('Commenting disabled')}
      </h1>
      <p className="w-full text-balance text-center text-lg leading-normal text-neutral-900 dark:text-white/85 sm:px-8">
        {supportEmail
          ? interpolate(
              t(
                "You can't post comments in this publication. <a>Contact support</a> for more information.",
              ),
              {
                a: (content) => (
                  <a
                    className="font-semibold hover:opacity-90"
                    href={`mailto:${supportEmail}`}
                    style={linkStyle}
                  >
                    {content}
                  </a>
                ),
              },
            )
          : t("You can't post comments in this publication.")}
      </p>
    </>
  );
};

export default CommentingDisabledBox;
