const {promises: fs} = require('fs');
const path = require('path');

class CommentsServiceEmailRenderer {
    constructor({t}) {
        this.t = t;

        this.Handlebars = require('handlebars').create();
        this.Handlebars.registerHelper('t', function (key, options) {
            let hash = options?.hash;
            const params = hash || options || {};

            return t(key, {
                ...params,
                interpolation: {escapeValue: false}
            });
        });
        this.Handlebars.registerHelper('concat', (...args) => {
            args.pop(); // Remove the options object
            return new this.Handlebars.SafeString(args.join(''));
        });
    }

    async renderEmailTemplate(templateName, data) {
        const htmlTemplateSource = await fs.readFile(path.join(__dirname, './email-templates/', `${templateName}.hbs`), 'utf8');
        const htmlTemplate = this.Handlebars.compile(Buffer.from(htmlTemplateSource).toString());
        const textTemplate = require(`./email-templates/${templateName}.txt.js`);

        const html = htmlTemplate(data);
        const text = textTemplate(data, this.t);

        return {html, text};
    }
}

module.exports = CommentsServiceEmailRenderer;
