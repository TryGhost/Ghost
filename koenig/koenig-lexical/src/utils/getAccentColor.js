export function getAccentColor() {
    const editor = document.body.querySelector('.koenig-lexical');

    return (editor && getComputedStyle(editor).getPropertyValue('--kg-accent-color')) || '#ff0095';
}
