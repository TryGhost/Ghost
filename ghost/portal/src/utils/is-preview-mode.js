function isPreviewMode() {
    const [path, qs] = window.location.hash.substr(1).split('?');
    return (path === '/portal' && qs);
}

export default isPreviewMode;