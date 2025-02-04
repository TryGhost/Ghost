import {addCreateDocumentOption} from '../../utils/add-create-document-option';

// TODO - this is a placeholder for the cta card web template
function ctaCardTemplate(dataset) {
    const backgroundAccent = dataset.backgroundColor === 'accent' ? 'kg-style-accent' : '';
    const buttonAccent = dataset.buttonColor === 'accent' ? 'kg-style-accent' : '';
    const buttonStyle = dataset.buttonColor !== 'accent' ? `background-color: ${dataset.buttonColor};` : '';
    
    return `
        <div class="cta-card ${backgroundAccent}" data-layout="${dataset.layout}" style="background-color: ${dataset.backgroundColor};">
            ${dataset.hasImage ? `<img src="${dataset.imageUrl}" alt="CTA Image">` : ''}
            <div>
                ${dataset.textValue}
            </div>
            ${dataset.showButton ? `
                <a href="${dataset.buttonUrl}" class="kg-cta-button ${buttonAccent}" 
                   style="${buttonStyle} color: ${dataset.buttonTextColor};">
                    ${dataset.buttonText}
                </a>
            ` : ''}
            ${dataset.hasSponsorLabel ? `
                <div class="kg-sponsor-label">
                    Sponsored
                </div>
            ` : ''}
        </div>
    `;
}

// TODO - this is a placeholder for the email template
function emailCTATemplate(dataset) {
    const buttonStyle = dataset.buttonColor !== 'accent' ? `background-color: ${dataset.buttonColor};` : '';
    const backgroundStyle = `background-color: ${dataset.backgroundColor};`;
    
    return `
        <div class="cta-card-email" style="${backgroundStyle} padding: 16px; text-align: center; border-radius: 8px;">
            ${dataset.hasImage ? `<img src="${dataset.imageUrl}" alt="CTA Image" style="max-width: 100%; border-radius: 4px;">` : ''}
            <div class="cta-text" style="margin-top: 12px; color: ${dataset.textColor};">
                ${dataset.textValue}
            </div>
            ${dataset.showButton ? `
                <a href="${dataset.buttonUrl}" class="cta-button" 
                   style="display: inline-block; margin-top: 12px; padding: 10px 16px; 
                          ${buttonStyle} color: ${dataset.buttonTextColor}; text-decoration: none; 
                          border-radius: 4px;">
                    ${dataset.buttonText}
                </a>
            ` : ''}
            ${dataset.hasSponsorLabel ? `
                <div class="sponsor-label" style="margin-top: 8px; font-size: 12px; color: #888;">
                    Sponsored
                </div>
            ` : ''}
        </div>
    `;
}

export function renderCallToActionNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    const dataset = {
        layout: node.layout,
        textValue: node.textValue,
        showButton: node.showButton,
        buttonText: node.buttonText,
        buttonUrl: node.buttonUrl,
        buttonColor: node.buttonColor,
        buttonTextColor: node.buttonTextColor,
        hasSponsorLabel: node.hasSponsorLabel,
        backgroundColor: node.backgroundColor,
        hasImage: node.hasImage,
        imageUrl: node.imageUrl,
        textColor: node.textColor
    };

    if (options.target === 'email') {
        const emailDoc = options.createDocument();
        const emailDiv = emailDoc.createElement('div');

        emailDiv.innerHTML = emailCTATemplate(dataset, options);

        return {element: emailDiv.firstElementChild};
    }

    const htmlString = ctaCardTemplate(dataset);
    const element = document.createElement('div');
    element.innerHTML = htmlString?.trim();

    return {element: element.firstElementChild};
}
