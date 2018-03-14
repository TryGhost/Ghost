import {helper} from '@ember/component/helper';
import {htmlSafe} from '@ember/string';

export function kgStyle(params/*, hash*/) {
    let [style] = params;
    let cssClass = '';

    let atFontStyle = 'sans-serif f-headline fw7 tracked-2 lh-heading';
    let h1FontStyle = 'sans-serif f-subheadline fw7 tracked-2 lh-heading';
    let h2FontStyle = 'sans-serif f1 fw7 tracked-2 lh-title';
    let h3FontStyle = 'sans-serif f2 fw7 tracked-2 lh-title';
    let h4FontStyle = 'sans-serif f3 fw7 tracked-3 lh-title';
    let h5FontStyle = 'sans-serif f4 fw7 tracked-2 lh-copy';
    let h6FontStyle = 'sans-serif f5 fw7 tracked-3 lh-copy';
    let pFontStyle = 'f3 fw3 lh-copy tracked-1 serif';

    let cardBorderStyle = 'pt1 pb1 pl14 nl14 pr2 nr2 ba b--whitegrey br3 relative kg-card-hover';

    switch (style) {
    // Article title
    case 'at':
        cssClass = atFontStyle + ' tmb--2-0x';
        break;
    case 'at-0':
        cssClass = atFontStyle + ' tmb--0';
        break;
    case 'at-p':
        cssClass = atFontStyle + ' tmb';
        break;
    case 'at-h':
        cssClass = atFontStyle + ' tmb--2-5x';
        break;

    // Heading 1
    case 'h1':
    case 'h1-p':
        cssClass = h1FontStyle + ' tmb--0-5x';
        break;
    case 'h1-h':
        cssClass = h1FontStyle + ' tmb';
        break;
    case 'h1-media':
        cssClass = h1FontStyle + ' tmb--2-0x';
        break;
    case 'h1-hr':
        cssClass = h1FontStyle + ' tmb--3-0x';
        break;
    case 'h1-list':
        cssClass = h1FontStyle + ' tmb';
        break;
    case 'h1-0':
        cssClass = h1FontStyle + ' tmb--0';
        break;
    case 'h1-2':
        cssClass = h1FontStyle + ' tmb--2-0x';
        break;

    // Heading 2
    case 'h2':
    case 'h2-p':
        cssClass = h2FontStyle + ' tmb--0-25x';
        break;
    case 'h2-h':
        cssClass = h2FontStyle + ' tmb--0-75x';
        break;
    case 'h2-media':
        cssClass = h2FontStyle + ' tmb--2-0x';
        break;
    case 'h2-hr':
        cssClass = h2FontStyle + ' tmb--3-0x';
        break;
    case 'h2-list':
        cssClass = h2FontStyle + ' tmb';
        break;
    case 'h2-0':
        cssClass = h2FontStyle + ' tmb--0';
        break;
    case 'h2-2':
        cssClass = h2FontStyle + ' tmb--2-0x';
        break;

    // Heading 3
    case 'h3':
    case 'h3-p':
        cssClass = h3FontStyle + ' tmb--0-25x';
        break;
    case 'h3-h':
        cssClass = h3FontStyle + ' tmb--0-5x';
        break;
    case 'h3-media':
        cssClass = h3FontStyle + ' tmb--1-5x';
        break;
    case 'h3-hr':
        cssClass = h3FontStyle + ' tmb--3-0x';
        break;
    case 'h3-list':
        cssClass = h3FontStyle + ' tmb';
        break;
    case 'h3-0':
        cssClass = h3FontStyle + ' tmb--0';
        break;
    case 'h3-2':
        cssClass = h3FontStyle + ' tmb--2-0x';
        break;

    // Heading 4
    case 'h4':
    case 'h4-p':
        cssClass = h4FontStyle + ' tmb--0-25x';
        break;
    case 'h4-h':
        cssClass = h4FontStyle + ' tmb--0-25x';
        break;
    case 'h4-media':
        cssClass = h4FontStyle + ' tmb--1-5x';
        break;
    case 'h4-hr':
        cssClass = h4FontStyle + ' tmb--3-0x';
        break;
    case 'h4-list':
        cssClass = h4FontStyle + ' tmb';
        break;
    case 'h4-0':
        cssClass = h4FontStyle + ' tmb--0';
        break;
    case 'h4-2':
        cssClass = h4FontStyle + ' tmb--2-0x';
        break;

    // Heading 5
    case 'h5':
    case 'h5-p':
        cssClass = h5FontStyle + ' tmb--0-25x';
        break;
    case 'h5-h':
        cssClass = h5FontStyle + ' tmb--0-25x';
        break;
    case 'h5-media':
        cssClass = h5FontStyle + ' tmb--1-5x';
        break;
    case 'h5-hr':
        cssClass = h5FontStyle + ' tmb--3-0x';
        break;
    case 'h5-list':
        cssClass = h5FontStyle + ' tmb';
        break;
    case 'h5-0':
        cssClass = h5FontStyle + ' tmb--0';
        break;
    case 'h5-2':
        cssClass = h5FontStyle + ' tmb--2-0x';
        break;

    // Heading 6
    case 'h6':
    case 'h6-p':
        cssClass = h6FontStyle + ' tmb--0-25x';
        break;
    case 'h6-h':
        cssClass = h6FontStyle + ' tmb--0-25x';
        break;
    case 'h6-media':
        cssClass = h6FontStyle + ' tmb--1-5x';
        break;
    case 'h6-hr':
        cssClass = h6FontStyle + ' tmb--3-0x';
        break;
    case 'h6-list':
        cssClass = h6FontStyle + ' tmb';
        break;
    case 'h6-0':
        cssClass = h6FontStyle + ' tmb--0';
        break;
    case 'h6-2':
        cssClass = h6FontStyle + ' tmb--2-0x';
        break;

    // Paragraphs
    case 'p':
    case 'p-p':
        cssClass = pFontStyle + ' tmb--2-0x';
        break;
    case 'p-h':
        cssClass = pFontStyle + ' tmb--3-0x';
        break;
    case 'p-media':
        cssClass = pFontStyle + ' tmb--2-0x';
        break;
    case 'p-hr':
        cssClass = pFontStyle + ' tmb--3-0x';
        break;
    case 'p-list':
        cssClass = pFontStyle + ' tmb--1-5x';
        break;
    case 'p-0':
        cssClass = pFontStyle + ' tmb--0';
        break;

    // Lists
    case 'list':
    case 'list-p':
        cssClass = pFontStyle + ' tmb--1-25x';
        break;
    case 'list-h':
        cssClass = pFontStyle + ' tmb--3-0x';
        break;
    case 'list-hr':
        cssClass = pFontStyle + ' tmb--3-0x';
        break;
    case 'list-item':
        cssClass = 'lh-list';
        break;

    /* Component styles
    /* ------------------------------------------ */

    // links
    case 'link':
        cssClass = 'link darkgrey miw-100-m2 hover-blue kg-link';
        break;

    // More typography
    case 'strong':
        cssClass = 'darkgrey miw-100-m2';
        break;
    case 'em':
        cssClass = 'darkgrey miw-100-m2';
        break;
    case 'underline':
        cssClass = 'underline';
        break;
    case 'var':
        cssClass = 'fs-normal';
        break;
    case 'strike':
        cssClass = 'strike';
        break;
    case 'code-inline':
        cssClass = 'f5 fw3 bg-whitegrey br2 kg-code-inline';
        break;
    case 'code-block':
        cssClass = 'f6 lh-code fw3 bg-darkgrey-m2 pa3 white br3 tmb--2-0x';
        break;
    case 'mark':
        cssClass = 'mark';
        break;

    // Blockquotes
    case 'blockquote':
    case 'blockquote-p':
        cssClass = pFontStyle + ' bl bw2 b--blue pt1 pb1 pl5 i tmb--2-0x';
        break;
    case 'blockquote-h':
        cssClass = pFontStyle + ' bl bw2 b--blue pt1 pb1 pl5 i tmb--3-0x';
        break;
    case 'blockquote-media':
        cssClass = pFontStyle + ' bl bw2 b--blue pt1 pb1 pl5 i tmb--2-0x';
        break;
    case 'blockquote-hr':
        cssClass = pFontStyle + ' bl bw2 b--blue pt1 pb1 pl5 i tmb--3-0x';
        break;
    case 'blockquote-list':
        cssClass = pFontStyle + ' bl bw2 b--blue pt1 pb1 pl5 i tmb--1-5x';
        break;

    // Container cards
    case 'container-card':
    case 'container-card-p':
        cssClass = cardBorderStyle + ' tmb--2-0x mih10';
        break;

    // Generic media card
    case 'media-card':
    case 'media-card-p':
        cssClass = pFontStyle + ' nt2 nr2 nl2 pa2 ba b--transparent kg-card-hover tmb--2-0x';
        break;
    case 'media-card-h':
        cssClass = pFontStyle + ' nt2 nr2 nl2 pa2 ba b--transparent kg-card-hover tmb--3-0x';
        break;
    case 'media-card-media':
        cssClass = pFontStyle + ' nt2 nr2 nl2 pa2 ba b--transparent kg-card-hover tmb--2-0x';
        break;
    case 'media-card-hr':
        cssClass = pFontStyle + ' nt2 nr2 nl2 pa2 ba b--transparent kg-card-hover tmb--3-0x';
        break;
    case 'media-card-list':
        cssClass = pFontStyle + ' nt2 nr2 nl2 pa2 ba b--transparent kg-card-hover tmb--1-5x';
        break;

    // Media styles & figure caption
    case 'image-wide':
        cssClass = 'mw-l center db';
        break;
    case 'image-normal':
        cssClass = 'center db';
        break;
    case 'figcaption':
        cssClass = 'db pa2 pb0 mw-s center lh-title sans-serif fw4 f7 middarkgrey tracked-2 tc';
        break;

    // Forms
    case 'form-fieldset':
        cssClass = pFontStyle + ' tmb--2-0x';
        break;

    // Horizontal ruler
    case 'hr':
        cssClass = 'bb bw1 bt-0 bl-0 br-0 b--lightgrey tmb--3-0x';
        break;

    // Tables
    case 'table':
        cssClass = 'collapse serif f5 lh-copy tmb--3-0x';
        break;
    case 'table-row':
        cssClass = 'bb b--whitegrey';
        break;
    case 'table-cell':
        cssClass = 'pa2';
        break;
    }

    return htmlSafe(cssClass);
}

export default helper(kgStyle);
