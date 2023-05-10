import {addCreateDocumentOption} from '../../utils/add-create-document-option';

// TODO this is a placeholder, we need to figure out what the signup card should look like and
// which elements should be customizable inside the editor
// ref https://ghost.org/docs/themes/members#signup-forms
export function renderSignupCardToDOM(dataset, options = {}) {
    const nodeData = {
        style: dataset.__style,
        buttonText: dataset.__buttonText,
        header: dataset.__header,
        subheader: dataset.__subheader,
        disclaimer: dataset.__disclaimer,
        backgroundImageSrc: dataset.__backgroundImageSrc
    };

    addCreateDocumentOption(options);

    const document = options.createDocument();
    const form = document.createElement('form');

    form.setAttribute('data-members-form', '');
    if (nodeData.backgroundImageSrc) {
        form.style.backgroundImage = `url('${nodeData.backgroundImageSrc}')`;
    }
  
    const header = document.createElement('h1');
    header.textContent = nodeData.header;
  
    const subheader = document.createElement('h2');
    subheader.textContent = nodeData.subheader;
  
    const disclaimer = document.createElement('p');
    disclaimer.textContent = nodeData.disclaimer;
  
    const emailLabel = document.createElement('label');
    emailLabel.setAttribute('for', 'email');
    emailLabel.textContent = 'Email';
  
    const emailInput = document.createElement('input');
    emailInput.setAttribute('id', 'email');
    emailInput.setAttribute('data-members-email', '');
    emailInput.setAttribute('type', 'email');
    emailInput.setAttribute('required', true);
  
    const submitButton = document.createElement('button');
    submitButton.setAttribute('type', 'submit');
    submitButton.textContent = nodeData.buttonText;
  
    form.appendChild(header);
    form.appendChild(subheader);
    form.appendChild(disclaimer);
    form.appendChild(emailLabel);
    form.appendChild(emailInput);
    form.appendChild(submitButton);
  
    return form.outerHTML;
}