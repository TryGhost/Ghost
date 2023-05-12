// TODO this is a placeholder, we need to figure out what the signup card should look like and
// which elements should be customizable inside the editor
// ref https://ghost.org/docs/themes/members#signup-forms

function cardTemplate(nodeData) {
    return `
        <form data-members-form="" style="background-image: url(${nodeData.backgroundImageSrc});">
            <h1>${nodeData.header}</h1>
            <h2>${nodeData.subheader}</h2>
            <p>${nodeData.disclaimer}</p>
            <label for="email">Email</label>
            <input id="email" data-members-email="" type="email" required="true">
            <button type="submit">${nodeData.buttonText}</button>
        </form>
    `;
}

export function renderSignupCardToDOM(dataset, options = {}) {
    const node = {
        buttonText: dataset.__buttonText,
        header: dataset.__header,
        subheader: dataset.__subheader,
        disclaimer: dataset.__disclaimer,
        backgroundImageSrc: dataset.__backgroundImageSrc,
        backgroundColor: dataset.__backgroundColor,
        buttonColor: dataset.__buttonColor,
        labels: dataset.__labels
    };

    const htmlString = options.target === 'email' ? '' : cardTemplate(node);
    return htmlString;
}
