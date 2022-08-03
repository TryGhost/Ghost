// Atoms are effectively read-only inline cards
// Full docs: https://github.com/bustle/mobiledoc-kit/blob/master/ATOMS.md

// import createComponentAtom from '../utils/create-component-atom';

export const ATOM_COMPONENT_MAP = {};

// soft-return is triggered by SHIFT+ENTER and allows for line breaks
// without creating paragraphs
export const softReturn = {
    name: 'soft-return',
    type: 'dom',
    render() {
        return document.createElement('br');
    }
};

export default [
    softReturn
];
