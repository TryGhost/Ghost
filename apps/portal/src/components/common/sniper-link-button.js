/**
 * @param {object} props
 * @param {string} props.href
 * @param {string} props.label
 * @param {string} props.brandColor
 */
function SniperLinkButton({
    href,
    brandColor,
    label
}) {
    return (
        <a
            href={href}
            target='_blank'
            rel='noreferrer noopener'
            className='gh-portal-btn gh-portal-btn-main gh-portal-btn-primary'
            style={{background: brandColor}}
        >
            {label}
        </a>
    );
}

export default SniperLinkButton;
