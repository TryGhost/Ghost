import Prettier from '@prettier/sync';

export function html(partials: readonly string[], ...params: readonly string[]): string {
    let output = '';
    for (let i = 0; i < partials.length; i++) {
        output += partials[i];
        if (i < partials.length - 1) {
            output += params[i];
        }
    }

    return Prettier.format(output, {parser: 'html'});
}