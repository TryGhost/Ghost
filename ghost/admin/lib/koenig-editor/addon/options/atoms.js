// Atoms are effectively read-only inline cards
// Full docs: https://github.com/bustle/mobiledoc-kit/blob/master/ATOMS.md

export default [
    // soft-return is triggered by SHIFT+ENTER and allows for line breaks
    // without creating paragraphs
    {
        name: 'soft-return',
        type: 'dom',
        render() {
            return document.createElement('br');
        }
    }
];
