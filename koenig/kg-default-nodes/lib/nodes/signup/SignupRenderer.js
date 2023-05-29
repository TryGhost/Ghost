import {addCreateDocumentOption} from '../../utils/add-create-document-option';

// ref https://ghost.org/docs/themes/members#signup-forms

function cardTemplate(nodeData) {
    const cardClasses = getCardClasses(nodeData).join(' ');

    const backgroundAccent = nodeData.backgroundColor === 'accent' ? 'kg-style-accent' : '';
    const buttonAccent = nodeData.buttonColor === 'accent' ? 'kg-style-accent' : '';
    const alignment = nodeData.alignment === 'center' ? 'align-center' : '';
    const backgroundImageStyle = nodeData.layout === 'split' ? '' : `background-image: url(${nodeData.backgroundImageSrc})`;

    const formTemplate = `
        <form class="kg-signup-card-form" data-members-form="signup">
            ${nodeData.labels.map(label => `<input data-members-label type="hidden" value="${label}" />`).join('\n')}
            <div class="kg-signup-card-fields">
                <input class="kg-signup-card-input" id="email" data-members-email="" type="email" required="true" placeholder="yourname@example.com" />
                <button class="kg-signup-card-button ${buttonAccent}" style="background-color: ${nodeData.buttonColor}; color: ${nodeData.buttonTextColor};" type="submit">
                    <span class="kg-signup-card-button-default">${nodeData.buttonText || 'Subscribe'}</span>
                    <span class="kg-signup-card-button-loading" style="background-color: ${nodeData.buttonColor}">${loadingIcon()}</span>
                </button>
            </div>
            <div class="kg-signup-card-success" style="color: ${nodeData.textColor};">
                ${nodeData.successMessage || 'Thanks! Now check your email to confirm.'}
            </div>
            <div class="kg-signup-card-error" style="color: ${nodeData.textColor};" data-members-error></div>
        </form>
        `;

    return `
        <div class="${cardClasses}" data-lexical-signup-form style="display:none;">
            ${nodeData.layout === 'split' ? `<img class="kg-signup-card-image ${backgroundAccent}" style="background-color: ${nodeData.backgroundColor};" src="${nodeData.backgroundImageSrc}" alt="" />` : ''}
            <div class="kg-signup-card-container ${alignment} ${backgroundAccent}" style="background-color: ${nodeData.backgroundColor}; ${backgroundImageStyle}">
                <h2 class="kg-signup-card-heading" style="color: ${nodeData.textColor};">${nodeData.header}</h2>
                <h3 class="kg-signup-card-subheading" style="color: ${nodeData.textColor};">${nodeData.subheader}</h3>
                ${formTemplate}
                <p class="kg-signup-card-disclaimer" style="color: ${nodeData.textColor};">${nodeData.disclaimer}</p>
            </div>
        </div>
        `;
}

function loadingIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 24 24">
        <g stroke-linecap="round" stroke-width="2" fill="currentColor" stroke="none" stroke-linejoin="round" class="nc-icon-wrapper">
            <g class="nc-loop-dots-4-24-icon-o">
                <circle cx="4" cy="12" r="3"></circle>
                <circle cx="12" cy="12" r="3"></circle>
                <circle cx="20" cy="12" r="3"></circle>
            </g>
            <style data-cap="butt">
                .nc-loop-dots-4-24-icon-o{--animation-duration:0.8s}
                .nc-loop-dots-4-24-icon-o *{opacity:.4;transform:scale(.75);animation:nc-loop-dots-4-anim var(--animation-duration) infinite}
                .nc-loop-dots-4-24-icon-o :nth-child(1){transform-origin:4px 12px;animation-delay:-.3s;animation-delay:calc(var(--animation-duration)/-2.666)}
                .nc-loop-dots-4-24-icon-o :nth-child(2){transform-origin:12px 12px;animation-delay:-.15s;animation-delay:calc(var(--animation-duration)/-5.333)}
                .nc-loop-dots-4-24-icon-o :nth-child(3){transform-origin:20px 12px}
                @keyframes nc-loop-dots-4-anim{0%,100%{opacity:.4;transform:scale(.75)}50%{opacity:1;transform:scale(1)}}
            </style>
        </g>
    </svg>`;
}

export function renderSignupCardToDOM(dataset, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    const node = {
        alignment: dataset.__alignment,
        buttonText: dataset.__buttonText,
        header: dataset.__header,
        subheader: dataset.__subheader,
        disclaimer: dataset.__disclaimer,
        backgroundImageSrc: dataset.__backgroundImageSrc,
        backgroundColor: dataset.__backgroundColor,
        buttonColor: dataset.__buttonColor,
        labels: dataset.__labels,
        layout: dataset.__layout,
        textColor: dataset.__textColor,
        buttonTextColor: dataset.__buttonTextColor,
        successMessage: dataset.__successMessage,
        swapped: dataset.__swapped
    };

    const htmlString = options.target === 'email'
        ? ''
        : cardTemplate(node);

    const element = document.createElement('div');
    element.innerHTML = htmlString?.trim();

    if (node.header === '') {
        const h2Element = element.querySelector('.kg-signup-card-heading');
        if (h2Element) {
            h2Element.remove();
        }
    }

    if (node.subheader === '') {
        const h3Element = element.querySelector('.kg-signup-card-subheading');
        if (h3Element) {
            h3Element.remove();
        }
    }

    if (node.disclaimer === '') {
        const pElement = element.querySelector('.kg-signup-card-disclaimer');
        if (pElement) {
            pElement.remove();
        }
    }
    return element.firstElementChild;
}

export function getCardClasses(nodeData) {
    let cardClasses = ['kg-card kg-signup-card'];

    if (nodeData.layout && nodeData.layout !== 'split') {
        cardClasses.push(`kg-width-${nodeData.layout}`);
    }

    if (nodeData.layout === 'split') {
        cardClasses.push('kg-layout-split kg-width-full');
    }

    if (nodeData.swapped && nodeData.layout === 'split') {
        cardClasses.push('kg-swapped');
    }

    return cardClasses;
}
