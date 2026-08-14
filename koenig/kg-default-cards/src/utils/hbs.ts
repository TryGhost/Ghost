import Handlebars from 'handlebars';

export default function hbs(literals: TemplateStringsArray, ...values: unknown[]): Handlebars.TemplateDelegate {
    // interweave strings with substitutions
    let output = '';
    for (let i = 0; i < values.length; i++) {
        output += literals[i] + String(values[i]);
    }
    output += literals[values.length];

    // return compiled handlebars template
    return Handlebars.compile(output);
}
