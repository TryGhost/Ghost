export default function (selector) {
    const elem = document.querySelector(selector);

    if (!elem) {
        console.warn(`{{query-selector}} could not find an element matching "${selector}"`); //eslint-disable-line
    }

    return elem;
}
