import {ReactComponent as GhostLogo} from '../../images/ghost-logo-small.svg';

export default function PoweredBy() {
    // Note: please do not wrap "Powered by Ghost" in the translation function, as we don't
    // want it to be translated
    /* eslint-disable i18next/no-literal-string */
    return (
        <a href='https://ghost.org' target='_blank' rel='noopener noreferrer' onClick={() => {
            window.open('https://ghost.org', '_blank');
        }}>
            <GhostLogo />
            Powered by Ghost
        </a>
    );
    /* eslint-enable i18next/no-literal-string */
}
