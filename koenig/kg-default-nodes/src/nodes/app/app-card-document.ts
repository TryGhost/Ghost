// The document a card's snapshot shows in, on the site and in the editor: the app's static HTML
// and CSS, in an iframe sandboxed without `allow-same-origin`, under a CSP that only lets images
// and media load from the origins the app's current manifest declares and the site's own hosts.
// Ghost writes this document; the app's snapshot supplies no scripts.

/**
 * Ghost's only script in the document. It reports the card's height and turns a clicked link
 * into a request for the page to navigate, since the sandbox can't navigate the page itself.
 * Allowed by its hash, so a script that got past the sanitiser can't borrow its permission.
 */
export const APP_CARD_FRAME_SCRIPT = '(function(){'
    + 'var post=function(m){window.parent.postMessage(m,"*")};'
    + 'var root=document.getElementById("ghost-app-card");'
    + 'var last=0;'
    + 'var measure=function(){var h=Math.ceil(root.getBoundingClientRect().height);if(h!==last){last=h;post({type:"ghost-app-card:resize",height:h})}};'
    + 'if(typeof ResizeObserver!=="undefined"){new ResizeObserver(measure).observe(root)}'
    + 'window.addEventListener("load",measure);measure();'
    + 'document.addEventListener("click",function(e){'
    + 'var a=e.target instanceof Element?e.target.closest("a[href]"):null;'
    + 'if(!a||!e.isTrusted||e.button!==0){return}'
    + 'e.preventDefault();'
    + 'try{var u=new URL(a.getAttribute("href"),document.baseURI);'
    + 'if(["http:","https:","mailto:","tel:"].indexOf(u.protocol)!==-1){post({type:"ghost-app-card:navigate",href:u.href})}}catch(x){}'
    + '},true);'
    + '})();';

/** The CSP hash of `APP_CARD_FRAME_SCRIPT`. A unit test keeps it in step with the script. */
export const APP_CARD_FRAME_SCRIPT_HASH = 'sha256-1pi1k+cY44FhthWubg6YHw66JZc2i/MF68BsnPfxiCU=';

export interface AppCardDocumentOptions {
    html: string;
    css: string;
    title: string;
    /** Origins images may load from: the card's declared ones and the site's own hosts. */
    imageOrigins: string[];
    /** Origins audio and video may load from. */
    mediaOrigins: string[];
    /** Applied to the card's body, so it reads in the site's typeface. */
    fontFamily?: string;
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll('\'', '&#39;');
}

/** Keeps origins only: a source list entry with a path or anything else would widen the CSP. */
export function cspSources(origins: string[]): string {
    const sources = new Set<string>();
    for (const value of origins) {
        const url = URL.parse(value);
        if (url && (url.protocol === 'https:' || url.protocol === 'http:')) {
            sources.add(url.origin);
        }
    }
    return [...sources].join(' ');
}

/** CSS can't end its `<style>` element, as `<` becomes a CSS escape. */
export function escapeCss(css: string): string {
    return css.replaceAll('<', '\\3c ');
}

export function renderAppCardDocument({html, css, title, imageOrigins, mediaOrigins, fontFamily}: AppCardDocumentOptions): string {
    const images = cspSources(imageOrigins);
    const media = cspSources(mediaOrigins);
    const csp = [
        'default-src \'none\'',
        `script-src '${APP_CARD_FRAME_SCRIPT_HASH}'`,
        'style-src \'unsafe-inline\'',
        `img-src data: ${images}`.trim(),
        `media-src ${media || '\'none\''}`,
        'font-src data:',
        'connect-src \'none\'',
        'frame-src \'none\'',
        'form-action \'none\'',
        'base-uri \'none\''
    ].join('; ');
    const font = fontFamily && fontFamily.length <= 300 ? `body{font-family:${escapeCss(fontFamily).replaceAll(/[;{}]/g, '')}}` : '';

    return '<!doctype html><html><head><meta charset="utf-8">'
        + '<meta name="viewport" content="width=device-width,initial-scale=1">'
        + '<meta name="referrer" content="no-referrer">'
        + `<meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">`
        + `<title>${escapeHtml(title)}</title>`
        + `<style>html,body{margin:0;padding:0;background:transparent}#ghost-app-card{display:flow-root}${font}</style>`
        + `<style>${escapeCss(css)}</style>`
        + `</head><body><div id="ghost-app-card">${html}</div>`
        + `<script>${APP_CARD_FRAME_SCRIPT}</script>`
        + '</body></html>';
}
