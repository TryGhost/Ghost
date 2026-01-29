import {useAppContext} from '../../app-context';

const CommentingDisabledBox: React.FC = () => {
    const {accentColor, supportEmail, t} = useAppContext();

    const linkStyle = {
        color: accentColor
    };

    return (
        <>
            <h1 className="mb-2 text-center font-sans text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white/85">
                {t('Commenting disabled')}
            </h1>
            <p className="w-full text-balance text-center text-lg leading-normal text-neutral-900 sm:px-8 dark:text-white/85">
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
