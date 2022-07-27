// soft-return is triggered by SHIFT+ENTER and allows for line breaks
// without creating paragraphs
const softReturn = {
    name: 'soft-return',
    type: 'dom',
    render() {
        return document.createElement('br');
    }
};

export default softReturn;
