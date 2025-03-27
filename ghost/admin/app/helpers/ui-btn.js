import {helper} from '@ember/component/helper';

export function btnStyles(options = {}) {
    let button = 'dib midgrey btn-base br3 ba b--lightgrey-l1 pointer glow';
    let span = 'f8 fw5 tracked-2 dib pt0 pb0 tc';

    // Set style
    if (options.style) {
        switch (options.style) {
        case 'outline-white':
        case 'outline-white--s':
            button = 'bg-transparent dib white btn-base br3 ba b--white-60 pointer highlight-white';
            span = 'f8 fw5 tracked-2 dib pt0 pb0 tc';
            break;
        case 'outline-blue':
        case 'outline-blue--s':
            button = 'bg-transparent dib blue btn-base br3 ba b--lightgrey pointer glow';
            span = 'f8 fw5 tracked-2 dib pt0 pb0 tc';
            break;
        case 'blue':
        case 'blue--s':
            button = 'dib bw0 white br3 btn-base btn-blue pointer';
            span = 'f8 fw5 tracked-2 dib pt0 pb0 tc';
            break;
        case 'green':
        case 'green--s':
            button = 'dib bw0 white br3 btn-base btn-green pointer';
            span = 'f8 fw5 tracked-2 dib pt0 pb0 tc';
            break;
        case 'red':
        case 'red--s':
            button = 'dib bw0 white br3 btn-base btn-red pointer';
            span = 'f8 fw5 tracked-2 dib pt0 pb0 tc';
            break;
        }

        // Style ending with '--s' means small button
        if (options.style.substr(options.style.length - 3) === '--s') {
            button = `${button} btn-small`;
        }
    }

    if (options.class) {
        button = `${button} ${options.class}`;
    }

    button = `sans-serif ${button} flex-shrink-0`;
    span = `${span} inline-flex items-center`;

    return {
        button: button,
        span: span
    };
}

export function uiBtn([style], hash) {
    return btnStyles(Object.assign({}, {style}, hash)).button;
}

export default helper(uiBtn);
