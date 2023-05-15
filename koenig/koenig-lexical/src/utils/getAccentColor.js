export function getAccentColor() {
    return getComputedStyle(document.body.querySelector('.koenig-lexical')).getPropertyValue('--kg-accent-color') || '#ff0095';
}
