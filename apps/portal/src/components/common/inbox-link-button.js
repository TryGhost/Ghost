import {ReactComponent as EnvelopeIcon} from '../../images/icons/envelope.svg';
import {isAndroidChrome} from '../../utils/is-android-chrome';
import {getOwn} from '../../utils/get-own';
import {t} from '../../utils/i18n';

const gmailIcon = (
    <svg height="24" width="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 49.4 512 399.4200000000001"><g fill="none" fillRule="evenodd"><g fillRule="nonzero"><path d="M34.91 448.818h81.454V251L0 163.727V413.91c0 19.287 15.622 34.91 34.91 34.91z" fill="#4285f4"/><path d="M395.636 448.818h81.455c19.287 0 34.909-15.622 34.909-34.909V163.727L395.636 251z" fill="#34a853"/><path d="M395.636 99.727V251L512 163.727v-46.545c0-43.142-49.25-67.782-83.782-41.891z" fill="#fbbc04"/></g><path d="M116.364 251V99.727L256 204.455 395.636 99.727V251L256 355.727z" fill="#ea4335"/><path d="M0 117.182v46.545L116.364 251V99.727L83.782 75.291C49.25 49.4 0 74.04 0 117.18z" fill="#c5221f" fillRule="nonzero"/></g></svg>
);

const outlookIcon = (
    <svg clipRule="evenodd" fillRule="evenodd" height="2500" imageRendering="optimizeQuality" shapeRendering="geometricPrecision" textRendering="geometricPrecision" viewBox="0 0 6876 6994" width="2457" xmlns="http://www.w3.org/2000/svg"><path d="M0 779L4033 0l-14 6994L0 6160zm1430 3632c-305-357-390-918-244-1384 203-648 718-867 1149-717 246 86 465 293 582 610 56 152 86 326 88 503 4 318-106 692-324 953-335 400-903 441-1250 35zm314-339c-150-223-191-573-120-864 99-404 352-541 563-447 121 54 228 183 285 381 27 95 42 203 43 314 2 198-52 432-159 595-164 250-442 275-612 22zm2552-2598h2341c131 0 238 107 238 238v86L5035 3039c-24 16-83 62-132 93-72 47-77 38-153-5-117-65-319-203-455-297V1474zm2580 875v2504c0 200-164 365-365 365H4296V3366c133 88 310 204 419 271 88 54 104 79 202 22 45-26 89-60 119-80l1840-1229z" fill="#0072c6"/></svg>
);

const yahooIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3386.34 3010.5" shapeRendering="geometricPrecision" textRendering="geometricPrecision" imageRendering="optimizeQuality" fillRule="evenodd" clipRule="evenodd"><path d="M0 732.88h645.84l376.07 962.1 380.96-962.1h628.76l-946.8 2277.62H451.98l259.19-603.53L.02 732.88zm2763.84 768.75h-704.26L2684.65 0l701.69.03-622.5 1501.6zm-519.78 143.72c216.09 0 391.25 175.17 391.25 391.22 0 216.06-175.16 391.23-391.25 391.23-216.06 0-391.19-175.17-391.19-391.23 0-216.05 175.16-391.22 391.19-391.22z" fill="#5f01d1" fillRule="nonzero"/></svg>
);

const protonIcon = (
    <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fillRule="evenodd" clipRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2"><path d="M22.86 13.464l.002.002-10.005 11.105L0 10.419V4.315a.827.827 0 011.356-.637l14.265 11.846a3.722 3.722 0 004.758 0l2.481-2.06z" fill="url(#prefix___Linear1)" transform="matrix(13.8889 0 0 13.8889 6 6)"/><path d="M28.286 8.958l-5.426 4.506.002.002-7.184 6.345a3.31 3.31 0 01-4.308.065L0 10.42v18.142a3.724 3.724 0 003.724 3.724h24.562l2.571-11.664-2.571-11.664z" fill="url(#prefix___Radial2)" fillRule="nonzero" transform="matrix(13.8889 0 0 13.8889 6 6)"/><path d="M28.286 8.963v23.323h3.99A3.724 3.724 0 0036 28.562V4.315a.827.827 0 00-1.356-.637l-6.358 5.285z" fill="url(#prefix___Linear3)" transform="matrix(13.8889 0 0 13.8889 6 6)"/><defs><linearGradient id="prefix___Linear1" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="scale(-43.6455) rotate(73.941 .222 -.49)"><stop offset="0" stopColor="#e3d9ff"/><stop offset="1" stopColor="#7341ff"/></linearGradient><linearGradient id="prefix___Linear3" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="scale(-66.0342) rotate(65.129 .243 -.95)"><stop offset="0" stopColor="#e3d9ff"/><stop offset=".27" stopColor="#e3d9ff"/><stop offset="1" stopColor="#7341ff"/></linearGradient><radialGradient id="prefix___Radial2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(35.9848 0 0 33.9185 30.723 11.814)"><stop offset="0" stopColor="#6d4aff"/><stop offset=".56" stopColor="#6d4aff"/><stop offset=".99" stopColor="#aa8eff"/><stop offset="1" stopColor="#aa8eff"/></radialGradient></defs></svg>
);

const icloudIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="2500" height="2432" viewBox="85.04 232.402 412.912 401.703"><path d="M391.631 424.861l-4.477-1.119v-4.477c0-40.281-32.449-72.73-71.611-72.73-29.094 0-55.947 17.904-67.138 44.758l-3.355 7.834-5.595-5.596c-5.597-5.594-13.429-8.951-21.262-8.951a30.086 30.086 0 0 0-30.211 30.211l1.118 6.715-4.476 1.117c-21.26 6.715-35.807 25.736-35.807 46.996 0 26.854 22.38 49.234 49.234 49.234h185.745c25.734 0 48.113-21.262 48.113-48.115-1.114-22.379-16.78-41.401-40.278-45.877z" fill="#333"/><path d="M394.989 232.402H189.102c-58.185 0-104.062 46.996-104.062 104.062v193.578c0 58.186 46.995 104.062 104.062 104.062H393.87c58.187 0 104.062-46.996 104.062-104.062V337.583c1.118-58.185-45.877-105.181-102.943-105.181zm-11.19 298.76H198.054c-33.568 0-60.424-26.855-60.424-60.424 0-25.734 15.666-46.996 39.164-55.947 1.118-22.379 19.021-40.281 41.4-40.281 7.833 0 15.666 2.238 22.379 6.713 14.547-27.973 42.521-44.758 73.852-44.758 44.758 0 81.684 35.809 82.802 79.447 25.736 6.713 44.759 30.211 44.759 57.066-.001 31.328-25.737 58.184-58.187 58.184z" fill="#333"/><path d="M398.345 414.791c-2.237-44.758-38.044-79.445-82.802-79.445-31.33 0-60.424 17.904-73.852 44.76-6.714-4.477-14.546-6.715-22.379-6.715-22.379 0-40.282 17.902-41.401 40.281-23.498 8.951-39.163 31.33-39.163 55.947 0 33.568 26.855 60.424 60.424 60.424h185.746c32.448 0 59.304-26.854 59.304-59.305-2.237-25.737-20.14-49.233-45.877-55.947zm-14.546 105.181H198.054c-26.854 0-49.233-22.379-49.233-49.232 0-22.379 14.546-40.283 35.806-46.996l4.476-1.119-1.118-6.713c0-16.785 13.427-30.213 30.211-30.213 7.833 0 15.666 3.357 21.262 8.953l5.595 5.594 3.355-7.832c11.189-26.855 36.925-44.758 67.138-44.758 40.281 0 71.611 32.449 71.611 72.73v4.477l4.477 1.119c23.498 3.355 39.164 23.498 39.164 46.996-.003 25.734-21.264 46.994-46.999 46.994z" fill="#e4e4e4"/></svg>
);

const defaultEmailIcon = <EnvelopeIcon className="gh-portal-inbox-link-icon" />;

const PROVIDER_ICONS = {
    gmail: gmailIcon,
    outlook: outlookIcon,
    yahoo: yahooIcon,
    proton: protonIcon,
    icloud: icloudIcon,
    hey: defaultEmailIcon,
    aol: defaultEmailIcon,
    mailru: defaultEmailIcon,
    'dev-mailpit': defaultEmailIcon
};

const PROVIDER_LABELS = {
    gmail: t('Open Gmail'),
    outlook: t('Open Outlook'),
    yahoo: t('Open Yahoo Mail'),
    proton: t('Open Proton Mail'),
    icloud: t('Open iCloud Mail'),
    hey: t('Open Hey'),
    aol: t('Open AOL Mail'),
    mailru: t('Open Mail.ru'),
    'dev-mailpit': 'Open Mailpit (development only)'
};

/**
 * @param {object} props
 * @param {object} props.inboxLinks
 * @param {string} props.inboxLinks.android
 * @param {string} props.inboxLinks.desktop
 * @param {'gmail' | 'yahoo' | 'outlook' | 'proton' | 'icloud' | 'hey' | 'aol' | 'mailru' | 'dev-mailpit'} props.inboxLinks.provider
 */
function InboxLinkButton({
    inboxLinks: {android, desktop, provider}
}) {
    return (
        <a
            href={isAndroidChrome(navigator) ? android : desktop}
            target='_blank'
            rel='noreferrer noopener'
            className='gh-portal-btn gh-portal-btn-inbox-link'
        >
            {getOwn(PROVIDER_ICONS, provider) ?? defaultEmailIcon}
            <span>{getOwn(PROVIDER_LABELS, provider) ?? t('Open email')}</span>
        </a>
    );
}

export default InboxLinkButton;
