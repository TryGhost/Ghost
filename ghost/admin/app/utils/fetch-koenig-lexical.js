export default async function fetchKoenigLexical() {
    if (window['@tryghost/koenig-lexical']) {
        return window['@tryghost/koenig-lexical'];
    }

    // the manual specification of the protocol in the import template string is
    // required to work around ember-auto-import complaining about an unknown dynamic import
    // during the build step
    const GhostAdmin = window.GhostAdmin || window.Ember.Namespace.NAMESPACES.find(ns => ns.name === 'ghost-admin');
    const urlTemplate = GhostAdmin.__container__.lookup('config:main').editor?.url;
    const urlVersion = GhostAdmin.__container__.lookup('config:main').editor?.version;

    const url = new URL(urlTemplate.replace('{version}', urlVersion));

    if (url.protocol === 'http:') {
        await import(`http://${url.host}${url.pathname}`);
    } else {
        await import(`https://${url.host}${url.pathname}`);
    }

    return window['@tryghost/koenig-lexical'];
}
