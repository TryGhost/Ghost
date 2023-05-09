import {addCreateDocumentOption} from '../../utils/add-create-document-option';

// TODO this is a placeholder, we need to figure out what the signup card should look like and
// which elements should be customizable inside the editor
// ref https://ghost.org/docs/themes/members#signup-forms
export function renderSignupCardToDOM(_, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();
    const form = document.createElement('form');
    form.setAttribute('data-members-form', '');

    const emailInput = document.createElement('input');
    emailInput.setAttribute('data-members-email', '');
    emailInput.setAttribute('type', 'email');
    emailInput.setAttribute('required', '');

    const submitButton = document.createElement('button');
    submitButton.setAttribute('type', 'submit');
    submitButton.textContent = 'Continue';

    form.appendChild(emailInput);
    form.appendChild(submitButton);

    return form.outerHTML;
}