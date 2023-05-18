import {addCreateDocumentOption} from '../../utils/add-create-document-option';

// TODO this is a placeholder, we need to figure out what the signup card should look like and
// which elements should be customizable inside the editor
// ref https://ghost.org/docs/themes/members#signup-forms

function cardTemplate(nodeData) {
    return `
    <div data-lexical-signup-form style="display:none">
        <h1>${nodeData.header}</h1>
        <h2>${nodeData.subheader}</h2>
        <p>${nodeData.disclaimer}</p>
        <form data-members-form="" style="background-image: url(${nodeData.backgroundImageSrc});">
            <input id="email" data-members-email="" type="email" required="true" />
            <button type="submit">${nodeData.buttonText}</button>
        </form>
    </div>
    `;
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
        layout: dataset.__layout
    };

    const htmlString = options.target === 'email'
        ? ''
        : cardTemplate(node);

    const element = document.createElement('div');
    element.innerHTML = htmlString?.trim();
    return element.firstElementChild;
}
