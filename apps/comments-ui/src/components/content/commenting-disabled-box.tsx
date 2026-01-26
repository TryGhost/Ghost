import {useAppContext} from '../../app-context';

const CommentingDisabledBox: React.FC = () => {
    const {accentColor, supportEmail, t} = useAppContext();

    const linkStyle = {
        color: accentColor
    };

    return (
        <>
            <h1 className="mb-[8px] text-center font-sans text-2xl font-semibold tracking-tight text-black dark:text-[rgba(255,255,255,0.85)]">
                {t('Commenting disabled')}
            </h1>
            <p className="mb-[28px] w-full px-0 text-center font-sans text-lg leading-normal text-neutral-600 sm:max-w-screen-sm sm:px-8 dark:text-[rgba(255,255,255,0.85)]">
                {supportEmail ? (
                    <>
                        {t('You can\'t post comments in this publication.')}{' '}
                        <a className="font-semibold hover:opacity-90" href={`mailto:${supportEmail}`} style={linkStyle}>
                            {t('Contact support')}
                        </a>{' '}
                        {t('for more information.')}
                    </>
                ) : (
                    t('You can\'t post comments in this publication.')
                )}
            </p>
        </>
    );
};

export default CommentingDisabledBox;
