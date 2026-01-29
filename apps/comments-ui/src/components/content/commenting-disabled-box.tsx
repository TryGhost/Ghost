import {useAppContext} from '../../app-context';

const CommentingDisabledBox: React.FC = () => {
    const {accentColor, supportEmail, t} = useAppContext();

    const linkStyle = {
        color: accentColor
    };

    return (
        <>
            <h1 className="mb-2 text-center font-sans text-neutral-900 text-2xl font-semibold tracking-tight dark:text-white/85">
                {t('Commenting disabled')}
            </h1>
            <p className="w-full text-center text-lg text-neutral-900 leading-normal sm:px-8 dark:text-white/85 text-balance">
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
